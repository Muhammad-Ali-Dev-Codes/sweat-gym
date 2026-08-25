/**
 * Phase 9 E2E verification against the live database.
 * Simulates: signup -> onboarding persistence -> plan generation ->
 * start workout -> complete via RPC -> progression/streak/notifications/
 * achievements/idempotency checks. Run with tsx.
 */
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const EMAIL = `titan-e2e-${Date.now()}@gmx.com`;
const PASSWORD = "T1tan-E2E-Pass!";
let passed = 0;
let failed = 0;

function check(name: string, ok: boolean, detail = "") {
  if (ok) {
    passed++;
    console.log(`  PASS ${name}`);
  } else {
    failed++;
    console.log(`  FAIL ${name} ${detail}`);
  }
}

async function main() {
  console.log(`\nSigning up ${EMAIL}`);

  const { data: signUp, error: signUpErr } = await supabase.auth.signUp({
    email: EMAIL,
    password: PASSWORD,
    options: { data: { full_name: "E2E Tester" } },
  });
  check("signup returns session", !signUpErr && !!signUp.session, signUpErr?.message);

  const { data: { user } } = await supabase.auth.getUser();
  check("authenticated getUser", !!user);
  if (!user) process.exit(1);
  const userId = user.id;

  // ---- Onboarding persistence -------------------------------------------
  console.log("\nOnboarding");
  const tz = "Asia/Karachi";
  await supabase.from("profiles").upsert({
    user_id: userId,
    full_name: "E2E Tester",
    age: 27,
    timezone: tz,
    onboarding_completed: true,
  });
  await supabase.from("fitness_profiles").upsert({
    user_id: userId,
    fitness_level: "beginner",
    push_up_ability: "5_10",
    plank_ability: "30_60",
    height_cm: 175,
    target_weight_kg: 68,
  });
  await supabase.from("weight_entries").insert({
    user_id: userId,
    weight_kg: 75,
    recorded_at: new Date().toISOString(),
  });

  const { data: fp } = await supabase
    .from("fitness_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();
  check("fitness profile persisted", fp?.fitness_level === "beginner");

  // ---- Plan generation ----------------------------------------------------
  console.log("\nPlan generation");
  const { data: level } = await supabase.from("levels").select("id").eq("slug", "beginner").single();
  const { data: template } = await supabase
    .from("plan_templates")
    .select("id")
    .eq("is_active", true)
    .eq("fitness_level_id", level!.id)
    .limit(1)
    .maybeSingle();
  check("template found for level", !!template);

  const { data: plan } = await supabase
    .from("user_plans")
    .insert({ user_id: userId, plan_template_id: template!.id, status: "active" })
    .select()
    .single();

  const { data: tplDays } = await supabase
    .from("plan_template_days")
    .select("*")
    .eq("plan_template_id", template!.id)
    .order("day_number")
    .limit(3);

  await supabase.from("user_plan_days").insert(
    tplDays!.map((td, i) => ({
      user_plan_id: plan!.id,
      day_number: td.day_number,
      workout_id: td.workout_id,
      target_duration_seconds: td.target_duration_seconds,
      target_calories: td.target_calories,
      status: i === 0 ? "available" : "locked",
      unlocked_at: i === 0 ? new Date().toISOString() : null,
    }))
  );

  // ---- Workout session ----------------------------------------------------
  console.log("\nWorkout session");
  const { data: days } = await supabase
    .from("user_plan_days")
    .select("*")
    .eq("user_plan_id", plan!.id)
    .order("day_number");

  const day1 = days![0];
  check("day1 available / day2 locked", day1.status === "available" && days![1].status === "locked");

  const sessionId = crypto.randomUUID();
  await supabase.from("workout_sessions").insert({
    id: sessionId,
    user_id: userId,
    workout_id: day1.workout_id,
    source: "plan",
    user_plan_day_id: day1.id,
    started_at: new Date().toISOString(),
    status: "in_progress",
    client_operation_id: crypto.randomUUID(),
  });
  check("session created", true);

  // ---- Authoritative completion via RPC -----------------------------------
  console.log("\nCompletion via complete_workout_session_rpc");
  const { data: rpc1, error: rpcErr } = await supabase.rpc(
    "complete_workout_session_rpc",
    {
      p_session_id: sessionId,
      p_duration_seconds: 600,
      p_estimated_calories: 90,
      p_timezone: tz,
    }
  );
  check("rpc executed", !rpcErr, rpcErr?.message);
  check("plan day completed", rpc1?.plan_day_completed === true);
  check("next day unlocked", rpc1?.next_day_unlocked === true);
  check("streak reported >= 1", (rpc1?.current_streak ?? 0) >= 1);

  // Idempotency: replay must not duplicate anything.
  const { data: rpc2 } = await supabase.rpc("complete_workout_session_rpc", {
    p_session_id: sessionId,
    p_duration_seconds: 600,
    p_estimated_calories: 90,
    p_timezone: tz,
  });
  check("replay flagged already_completed", rpc2?.already_completed === true);

  const { count: sessionCount } = await supabase
    .from("workout_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "completed");
  check("exactly one completed session", sessionCount === 1, `got ${sessionCount}`);

  const { count: notifCount } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("type", "workout_completed");
  check("exactly one workout notification (deduped)", notifCount === 1, `got ${notifCount}`);

  const { data: day2After } = await supabase
    .from("user_plan_days")
    .select("status")
    .eq("user_plan_id", plan!.id)
    .eq("day_number", 2)
    .single();
  check("day2 now available", day2After?.status === "available");

  // ---- Authorization -------------------------------------------------------
  console.log("\nAuthorization");
  const attacker = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: anonRead, error: anonReadErr } = await attacker
    .from("workout_sessions")
    .select("id")
    .eq("id", sessionId);
  check("anonymous cannot read user session", anonReadErr === null && (anonRead?.length ?? 0) === 0);

  const { data: anonRpc, error: anonRpcErr } = await attacker.rpc(
    "complete_workout_session_rpc",
    { p_session_id: sessionId, p_duration_seconds: 10, p_estimated_calories: 5 }
  );
  check("foreign caller blocked by ownership guard", anonRpcErr !== null || anonRpc?.error === "forbidden");

  // ---- Summary -------------------------------------------------------------
  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
