/**
 * Phase 11 live security & integrity verification against the remote database.
 *
 * Covers:
 *   A. Security regression guards (QA-C1/C2 fixes, transition triggers)
 *   B. RLS penetration matrix — two users, cross-account CRUD attempts
 *   C. Plan integrity — sequencing, duplicate-completion idempotency,
 *      concurrent completions, locked-day rejection
 *   D. Account deletion cascade
 *
 * Run: npx tsx src/scripts/e2e-phase11.ts
 */
import fs from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const PASSWORD = "T1tan-P11-Secure!";
const TZ = "Asia/Karachi";

const admin = createClient(URL, SERVICE);

let passed = 0;
let failed = 0;

function check(name: string, ok: boolean, detail = "") {
  if (ok) {
    passed++;
    console.log(`  PASS ${name}`);
  } else {
    failed++;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function info(name: string, detail = "") {
  console.log(`  SKIP ${name}${detail ? ` — ${detail}` : ""}`);
}

function section(title: string) {
  console.log(`\n=== ${title} ===`);
}

function newUser(): { client: SupabaseClient; email: string } {
  const email = `p11-${Math.random().toString(36).slice(2, 10)}-${Date.now()}@gmx.com`;
  return { client: createClient(URL, ANON), email };
}

async function signUpAs(
  client: SupabaseClient,
  email: string,
  fullName: string
): Promise<string> {
  // Email confirmation is enforced on this project, so sessions are created
  // via the admin API (confirmed, no invite email) followed by a real
  // password sign-in on the anonymous-key client under test.
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (createErr || !created.user) {
    throw new Error(`admin createUser failed for ${email}: ${createErr?.message}`);
  }
  const { data: signedIn, error: signInErr } = await client.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (signInErr || !signedIn.session) {
    throw new Error(`signIn failed for ${email}: ${signInErr?.message}`);
  }
  return created.user.id;
}

/** Cross-account probe: caller tries SELECT/UPDATE/DELETE on ownerRow.id. */
async function probeCrossAccess(
  attacker: SupabaseClient,
  table: string,
  ownerId: string,
  rowId: string | null,
  label: string,
  mutateValues: Record<string, unknown> = {}
) {
  if (!rowId) {
    info(`${label}: no target row`);
    return;
  }

  const { data: sel, error: selErr } = await attacker
    .from(table)
    .select("id")
    .eq("id", rowId);
  const readBlocked =
    selErr === null && (sel?.length ?? 0) === 0 &&
    !JSON.stringify(sel ?? []).includes(rowId);

  const { data: upd, error: updErr } = await attacker
    .from(table)
    .update({ ...mutateValues })
    .eq("id", rowId)
    .select("id");
  const updateBlocked =
    updErr === null && (upd?.length ?? 0) === 0;

  const { data: del, error: delErr } = await attacker
    .from(table)
    .delete()
    .eq("id", rowId)
    .select("id");
  const deleteBlocked =
    delErr === null && (del?.length ?? 0) === 0;

  check(
    `${label}: cross-user SELECT denied`,
    readBlocked,
    selErr?.message ?? JSON.stringify(sel)
  );
  check(
    `${label}: cross-user UPDATE denied`,
    updateBlocked,
    updErr?.message ?? JSON.stringify(upd)
  );
  check(
    `${label}: cross-user DELETE denied`,
    deleteBlocked,
    delErr?.message ?? JSON.stringify(del)
  );
  void ownerId;
}

async function main() {
  const A = newUser();
  const B = newUser();

  // =========================================================================
  section("A. Security regression guards");
  // =========================================================================

  // A1. Legacy unowned function must be gone.
  {
    const { client } = { client: createClient(URL, ANON) };
    const { error } = await client.rpc("complete_plan_day", {
      p_user_plan_day_id: crypto.randomUUID(),
      p_session_id: crypto.randomUUID(),
    });
    const msg = error?.message ?? "";
    check(
      "QA-C2: legacy complete_plan_day removed",
      error !== null &&
        (msg.includes("Could not find the function") ||
          msg.toLowerCase().includes("does not exist")),
      msg
    );
  }

  // A2. Anonymous caller must be rejected by the hardened RPC guard.
  {
    const anon = createClient(URL, ANON);
    const { data, error } = await anon.rpc("complete_workout_session_rpc", {
      p_session_id: crypto.randomUUID(),
      p_duration_seconds: 10,
      p_estimated_calories: 5,
    });
    check(
      "QA-C1: anonymous RPC call fails closed",
      ((data as Record<string, unknown> | null)?.error ?? "") === "forbidden" ||
        error !== null,
      error?.message ?? JSON.stringify(data)
    );
  }

  await signUpAs(A.client, A.email, "Owner A");
  const uidA = (await A.client.auth.getUser()).data.user!.id;
  await signUpAs(B.client, B.email, "Rival B");
  const uidB = (await B.client.auth.getUser()).data.user!.id;

  // Seed minimal rows so trigger tests have targets.
  await A.client.from("profiles").upsert({
    user_id: uidA,
    full_name: "Owner A",
    age: 30,
    timezone: TZ,
    onboarding_completed: true,
  });

  // A3–A4. Direct client-role writes of completed rows must hit triggers.
  {
    const { error: insErr } = await A.client.from("workout_sessions").insert({
      id: crypto.randomUUID(),
      user_id: uidA,
      workout_id: (await A.client.from("workouts").select("id").limit(1)).data![0].id,
      source: "discover",
      started_at: new Date().toISOString(),
      status: "completed",
      duration_seconds: 300,
      estimated_calories: 40,
    });
    check(
      "trigger: direct INSERT of completed session rejected",
      insErr !== null,
      insErr?.message
    );

    const { error: dayInsErr } = await A.client
      .from("fitness_profiles")
      .upsert({
        user_id: uidA,
        fitness_level: "beginner",
        push_up_ability: "5_10",
        plank_ability: "30_60",
        height_cm: 170,
        target_weight_kg: 65,
      });
    check("setup: fitness profile seeded", !dayInsErr, dayInsErr?.message);
  }

  // =========================================================================
  section("B. RLS penetration matrix (A attacks B)");
  // =========================================================================

  // Seed a full footprint for B.
  await B.client.from("profiles").upsert({
    user_id: uidB,
    full_name: "Rival B",
    age: 31,
    timezone: TZ,
    onboarding_completed: true,
  });
  await B.client.from("fitness_profiles").upsert({
    user_id: uidB,
    fitness_level: "beginner",
    push_up_ability: "0_5",
    plank_ability: "15_30",
    height_cm: 180,
    target_weight_kg: 75,
  });
  await B.client.from("weight_entries").insert({
    user_id: uidB,
    weight_kg: 79.5,
    recorded_at: new Date().toISOString(),
  });

  const { data: lowImpactRestriction } = await B.client
    .from("physical_restrictions")
    .select("id")
    .eq("slug", "low_impact")
    .maybeSingle();
  if (lowImpactRestriction) {
    const r = await B.client.from("user_physical_restrictions").insert({
      user_id: uidB,
      restriction_id: lowImpactRestriction.id,
    });
    if (r.error) info(`seed restrictions failed: ${r.error.message}`);
  }

  const anyWorkoutId = (
    await B.client.from("workouts").select("id").limit(1)
  ).data![0].id;
  {
    const r = await B.client.from("favorite_workouts").insert({
      user_id: uidB,
      workout_id: anyWorkoutId,
    });
    if (r.error) info(`seed favorites failed: ${r.error.message}`);
  }
  {
    const r = await B.client.from("notification_preferences").upsert({
      user_id: uidB,
      reminder_time: "07:30",
    });
    if (r.error) info(`seed notification prefs failed: ${r.error.message}`);
  }
  {
    const r = await B.client.from("push_subscriptions").insert({
      user_id: uidB,
      endpoint: "https://fcm.googleapis.com/fcm/send/test-endpoint-p11",
      p256dh: "k",
      auth: "a",
    });
    if (r.error) info(`seed push subscription failed: ${r.error.message}`);
  }
  await B.client.from("notifications").insert({
    user_id: uidB,
    type: "workout_completed",
    title: "seed",
    body: "seed",
  });

  // B's plan + days + sessions (mirrors generated shape).
  const { data: level } = await B.client
    .from("levels")
    .select("id")
    .eq("slug", "beginner")
    .single();
  const { data: template } = await B.client
    .from("plan_templates")
    .select("id")
    .eq("is_active", true)
    .eq("fitness_level_id", level!.id)
    .limit(1)
    .maybeSingle();
  const { data: planB } = await B.client
    .from("user_plans")
    .insert({ user_id: uidB, plan_template_id: template!.id, status: "active" })
    .select()
    .single();
  const { data: tplDaysB } = await B.client
    .from("plan_template_days")
    .select("*")
    .eq("plan_template_id", template!.id)
    .order("day_number")
    .limit(3);
  await B.client.from("user_plan_days").insert(
    tplDaysB!.map((td, i) => ({
      user_plan_id: planB!.id,
      day_number: td.day_number,
      workout_id: td.workout_id,
      target_duration_seconds: td.target_duration_seconds,
      target_calories: td.target_calories,
      status: i === 0 ? "available" : "locked",
    }))
  );
  const bSessionId = crypto.randomUUID();
  await B.client.from("workout_sessions").insert({
    id: bSessionId,
    user_id: uidB,
    workout_id: tplDaysB![0].workout_id,
    source: "plan",
    started_at: new Date().toISOString(),
    status: "in_progress",
    client_operation_id: crypto.randomUUID(),
  });
  const { data: bWeRow } = await B.client
    .from("workout_exercises")
    .select("id")
    .eq("workout_id", tplDaysB![0].workout_id)
    .order("exercise_order")
    .limit(1)
    .maybeSingle();
  let bExerciseSessionId: string | null = null;
  if (bWeRow) {
    const ins = await B.client
      .from("workout_exercise_sessions")
      .insert({
        workout_session_id: bSessionId,
        workout_exercise_id: bWeRow.id,
        status: "pending",
        completed_sets: 0,
      })
      .select("id")
      .single();
    bExerciseSessionId = ins.data?.id ?? null;
  }

  // Fetch B row ids for probing.
  async function idOf(table: string): Promise<string | null> {
    let q = B.client.from(table).select("*").limit(1);
    if (table === "user_plan_days") q = q.eq("user_plan_id", planB!.id);
    else if (table === "workout_exercise_sessions")
      q = q.eq("workout_session_id", bSessionId);
    const { data, error } = await q.maybeSingle();
    if (error) info(`${table}: owner select error ${error.message}`);
    return (data as { id?: string } | null)?.id ?? null;
  }

  await probeCrossAccess(A.client, "profiles", uidB, null, "profiles", {
    full_name: "HACKED",
  });
  {
    const { data: sel } = await A.client
      .from("profiles")
      .select("user_id")
      .eq("user_id", uidB);
    check(
      "profiles: cross-user SELECT denied",
      (sel?.length ?? 0) === 0 && !JSON.stringify(sel).includes(uidB)
    );
    const { data: upd } = await A.client
      .from("profiles")
      .update({ full_name: "HACKED" })
      .eq("user_id", uidB)
      .select("user_id");
    check("profiles: cross-user UPDATE denied", (upd?.length ?? 0) === 0);
  }
  await probeCrossAccess(A.client, "fitness_profiles", uidB, null, "fitness_profiles", {
    height_cm: 1,
  });
  await probeCrossAccess(A.client, "weight_entries", uidB, await idOf("weight_entries"), "weight_entries", {
    weight_kg: 1,
  });
  await probeCrossAccess(A.client, "user_physical_restrictions", uidB, await idOf("user_physical_restrictions"), "restrictions", {});
  await probeCrossAccess(A.client, "user_plans", uidB, planB!.id, "user_plans", {
    status: "archived",
  });
  await probeCrossAccess(A.client, "user_plan_days", uidB, (await idOf("user_plan_days"))!, "user_plan_days", {
    status: "completed",
  });
  await probeCrossAccess(A.client, "workout_sessions", uidB, bSessionId, "workout_sessions", {
    status: "abandoned",
  });
  await probeCrossAccess(A.client, "workout_exercise_sessions", uidB, bExerciseSessionId, "exercise_sessions", {
    status: "skipped",
  });
  // favorite_workouts has a composite PK (user_id, workout_id) and no id.
  {
    const { data: sel } = await A.client
      .from("favorite_workouts")
      .select("workout_id")
      .eq("user_id", uidB);
    check(
      "favorites: cross-user SELECT denied",
      (sel?.length ?? 0) === 0 && !JSON.stringify(sel).includes(anyWorkoutId)
    );
    const { data: upd } = await A.client
      .from("favorite_workouts")
      .update({ workout_id: anyWorkoutId })
      .eq("user_id", uidB)
      .select("user_id");
    check("favorites: cross-user UPDATE denied", (upd?.length ?? 0) === 0);
    const { data: del } = await A.client
      .from("favorite_workouts")
      .delete()
      .eq("user_id", uidB)
      .select("user_id");
    check("favorites: cross-user DELETE denied", (del?.length ?? 0) === 0);
  }
  await probeCrossAccess(A.client, "notification_preferences", uidB, null, "notification_prefs", {
    reminder_time: "00:00",
  });
  await probeCrossAccess(A.client, "push_subscriptions", uidB, null, "push_subscriptions", {
    endpoint: "https://evil.example/push",
  });
  await probeCrossAccess(A.client, "notifications", uidB, await idOf("notifications"), "notifications", {
    title: "HACKED",
  });

  {
    const { data: sel } = await A.client
      .from("notification_preferences")
      .select("user_id")
      .eq("user_id", uidB);
    check(
      "notification_prefs: cross-user SELECT denied",
      (sel?.length ?? 0) === 0 && !JSON.stringify(sel).includes(uidB)
    );
    const { data: upd } = await A.client
      .from("notification_preferences")
      .update({ reminder_time: "00:00" })
      .eq("user_id", uidB)
      .select("user_id");
    check("notification_prefs: cross-user UPDATE denied", (upd?.length ?? 0) === 0);
  }
  {
    const { data: sel } = await A.client
      .from("push_subscriptions")
      .select("endpoint")
      .eq("user_id", uidB);
    check(
      "push_subscriptions: cross-user SELECT denied",
      (sel?.length ?? 0) === 0 && !JSON.stringify(sel).includes("fcm.googleapis.com")
    );
    const { data: upd } = await A.client
      .from("push_subscriptions")
      .update({ endpoint: "https://evil.example/push" })
      .eq("user_id", uidB)
      .select("endpoint");
    check("push_subscriptions: cross-user UPDATE denied", (upd?.length ?? 0) === 0);
  }

  // Public content: readable, not writable.
  {
    const { data: exRead, error: exErr } = await B.client
      .from("exercises")
      .select("id,name")
      .limit(1);
    check("public content: members can read catalog", !exErr && (exRead?.length ?? 0) === 1);
    // RLS silently filters non-matching rows: assert zero affected rows and
    // verify via service role that the row is untouched.
    const { data: exUpd, error: exWriteErr } = await B.client
      .from("exercises")
      .update({ name: "VANDALIZED" })
      .eq("id", exRead![0].id)
      .select();
    const { data: afterAdmin } = await admin
      .from("exercises")
      .select("name")
      .eq("id", exRead![0].id)
      .single();
    check(
      "public content: member write rejected",
      exWriteErr !== null ||
        ((exUpd?.length ?? 0) === 0 && afterAdmin?.name === exRead![0].name),
      `affected=${exUpd?.length}, nameNow=${afterAdmin?.name}`
    );
  }

  // =========================================================================
  section("C. Plan integrity & idempotency (User A full journey)");
  // =========================================================================
  const { data: planA } = await A.client
    .from("user_plans")
    .insert({ user_id: uidA, plan_template_id: template!.id, status: "active" })
    .select()
    .single();
  const { data: tplDaysA } = await A.client
    .from("plan_template_days")
    .select("*")
    .eq("plan_template_id", template!.id)
    .order("day_number");
  check("template provides 30 days", tplDaysA?.length === 30, `got ${tplDaysA?.length}`);
  await A.client.from("user_plan_days").insert(
    tplDaysA!.map((td, i) => ({
      user_plan_id: planA!.id,
      day_number: td.day_number,
      workout_id: td.workout_id,
      target_duration_seconds: td.target_duration_seconds,
      target_calories: td.target_calories,
      status: i === 0 ? "available" : "locked",
      unlocked_at: i === 0 ? new Date().toISOString() : null,
    }))
  );
  const { data: daysA } = await A.client
    .from("user_plan_days")
    .select("*")
    .eq("user_plan_id", planA!.id)
    .order("day_number");
  check(
    "Day1 available, Day2-30 locked",
    daysA![0].status === "available" && daysA!.slice(1).every((d) => d.status === "locked")
  );
  check("exactly 30 plan days", daysA?.length === 30);

  const sessA = crypto.randomUUID();
  await A.client.from("workout_sessions").insert({
    id: sessA,
    user_id: uidA,
    workout_id: daysA![0].workout_id,
    source: "plan",
    user_plan_day_id: daysA![0].id,
    started_at: new Date().toISOString(),
    status: "in_progress",
    client_operation_id: crypto.randomUUID(),
  });

  // C1. Locked-day skip attack via direct RPC on a crafted locked-day session.
  {
    const evil = crypto.randomUUID();
    await A.client.from("workout_sessions").insert({
      id: evil,
      user_id: uidA,
      workout_id: daysA![4].workout_id,
      source: "plan",
      user_plan_day_id: daysA![4].id, // Day 5 — locked
      started_at: new Date().toISOString(),
      status: "in_progress",
      client_operation_id: crypto.randomUUID(),
    });
    const { data } = await A.client.rpc("complete_workout_session_rpc", {
      p_session_id: evil,
      p_duration_seconds: 600,
      p_estimated_calories: 50,
      p_timezone: TZ,
    });
    check(
      "locked-day completion rejected by RPC",
      (data as Record<string, unknown>)?.error === "plan_day_locked",
      JSON.stringify(data)
    );
    const { data: day5 } = await A.client
      .from("user_plan_days")
      .select("status")
      .eq("id", daysA![4].id)
      .single();
    check("Day 5 remains locked", day5?.status === "locked");
  }

  // C2. Duplicate completion is idempotent.
  const { data: rpc1, error: rpc1Err } = await A.client.rpc(
    "complete_workout_session_rpc",
    {
      p_session_id: sessA,
      p_duration_seconds: 480,
      p_estimated_calories: 45,
      p_timezone: TZ,
    }
  );
  check("Day1 completion succeeds", !rpc1Err && rpc1?.plan_day_completed === true, rpc1Err?.message);
  check("Day1 completion unlocks Day2", rpc1?.next_day_unlocked === true);
  const { data: day2After1 } = await A.client
    .from("user_plan_days")
    .select("status, unlocked_at")
    .eq("user_plan_id", planA!.id)
    .eq("day_number", 2)
    .single();
  const firstUnlockAt = day2After1?.unlocked_at;

  const { data: rpcReplay } = await A.client.rpc("complete_workout_session_rpc", {
    p_session_id: sessA,
    p_duration_seconds: 480,
    p_estimated_calories: 45,
    p_timezone: TZ,
  });
  check("duplicate completion flagged already_completed", rpcReplay?.already_completed === true);
  const { data: day2AfterReplay } = await A.client
    .from("user_plan_days")
    .select("unlocked_at")
    .eq("user_plan_id", planA!.id)
    .eq("day_number", 2)
    .single();
  check(
    "no double progression on replay",
    day2AfterReplay?.unlocked_at === firstUnlockAt,
    `${firstUnlockAt} vs ${day2AfterReplay?.unlocked_at}`
  );
  const { count: notifDup } = await A.client
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", uidA)
    .eq("type", "workout_completed");
  check("notification dedupe on replay", notifDup === 1, `got ${notifDup}`);

  // C3. Concurrent duplicate deliveries converge without corruption.
  const results = await Promise.all(
    Array.from({ length: 6 }, () =>
      A.client.rpc("complete_workout_session_rpc", {
        p_session_id: sessA,
        p_duration_seconds: 480,
        p_estimated_calories: 45,
        p_timezone: TZ,
      })
    )
  );
  const alreadyCount = results.filter(
    (r) => r.data?.already_completed === true
  ).length;
  check("all 6 replays report already_completed", alreadyCount === 6, `got ${alreadyCount}`);
  const { count: notifConc } = await A.client
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", uidA)
    .eq("type", "workout_completed");
  check("still exactly one notification after burst", notifConc === 1, `got ${notifConc}`);

  // C4. One-active-plan invariant under concurrent generation attempts.
  {
    const attempts = await Promise.all(
      Array.from({ length: 3 }, () =>
        A.client.from("user_plans").insert({ user_id: uidA, plan_template_id: template!.id, status: "active" })
      )
    );
    const dupRejected = attempts.filter((r) => r.error !== null).length;
    check(
      "concurrent active-plan creation blocked by unique index",
      dupRejected >= 1,
      `${dupRejected}/3 rejected`
    );
    // Clean up the successful extra (archived by index conflict handling? No —
    // only one can succeed; others errored. Nothing to clean.)
  }

  // =========================================================================
  section("D. Account deletion cascade");
  // =========================================================================
  {
    const { error: delErr } = await admin.auth.admin.deleteUser(uidB);
    check("admin deletion of User B succeeded", !delErr, delErr?.message);

    const tablesByUser = [
      "profiles",
      "fitness_profiles",
      "weight_entries",
      "user_plans",
      "favorite_workouts",
      "notification_preferences",
      "push_subscriptions",
      "notifications",
    ];
    for (const t of tablesByUser) {
      const { count } = await admin
        .from(t)
        .select("user_id", { count: "exact", head: true })
        .eq("user_id", uidB);
      check(`cascade removed ${t}`, (count ?? 0) === 0, `left ${count}`);
    }
    const { count: leftSessions } = await admin
      .from("workout_sessions")
      .select("user_id", { count: "exact", head: true })
      .eq("user_id", uidB);
    check("cascade removed workout_sessions", (leftSessions ?? 0) === 0);
    const { data: orphanDays } = await admin
      .from("user_plan_days")
      .select("id")
      .eq("user_plan_id", planB!.id);
    check("cascade removed user_plan_days", (orphanDays?.length ?? 0) === 0);
  }

  // Cleanup: remove test user A entirely.
  await admin.auth.admin.deleteUser(uidA);

  // =========================================================================
  console.log(`\n=== RESULT: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
