/**
 * Phase 11 live HTTP tests for /api/sync against the production server.
 * Requires `npm start` on PORT (default 3111).
 *
 * Covers: 401 unauthenticated gate, schema validation 400s, locked-plan-day
 * rejection via sync path, replay idempotency over HTTP, cross-user attack
 * handling without error leakage, and generic 500 masking.
 */
import fs from "node:fs";
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";

type SB = SupabaseClient;

const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BASE = `http://localhost:${process.env.TEST_PORT ?? 3111}`;
const REF = URL.replace(/^https:\/\/([^\.]+)\..*$/, "$1");
const PASSWORD = "T1tan-P11-Secure!";
const TZ = "Asia/Karachi";

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

function toBase64Url(s: string): string {
  return Buffer.from(s, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Build the @supabase/ssr auth cookie header for a session. */
function authCookie(session: Session): string {
  const raw = JSON.stringify(session);
  const encoded = "base64-" + toBase64Url(raw);
  const key = `sb-${REF}-auth-token`;
  // Mirror ssr chunking (>3180 chars per chunk).
  const CHUNK = 3180;
  if (encoded.length <= CHUNK) return `${key}=${encodeURIComponent(encoded)}`;
  const parts: string[] = [];
  for (let i = 0; i < encoded.length; i += CHUNK) parts.push(encoded.slice(i, i + CHUNK));
  return parts.map((p, i) => `${key}.${i}=${encodeURIComponent(p)}`).join("; ");
}

async function postSync(
  cookie: string,
  body: unknown
): Promise<{ status: number; json: Record<string, unknown> }> {
  const res = await fetch(`${BASE}/api/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify(body),
  });
  let json: Record<string, unknown> = {};
  try {
    json = await res.json();
  } catch {
    /* empty body */
  }
  return { status: res.status, json };
}

async function provisionUser(
  admin: SB,
  label: string
): Promise<{ uid: string; client: SB; session: Session }> {
  const email = `p11-api-${label}-${Date.now()}@gmx.com`;
  const { data: cu } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  const client = createClient(URL, ANON);
  const { data } = await client.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (!data.session) throw new Error("no session");
  return { uid: cu!.user!.id, client, session: data.session };
}

async function seedPlan(
  client: SB,
  uid: string
): Promise<{ planId: string; days: Array<Record<string, unknown>> }> {
  await client.from("profiles").upsert({
    user_id: uid,
    full_name: "API Tester",
    timezone: TZ,
    onboarding_completed: true,
  });
  const level = (
    await client.from("levels").select("id").eq("slug", "beginner").single()
  ).data!.id;
  const template = (
    await client
      .from("plan_templates")
      .select("id")
      .eq("is_active", true)
      .eq("fitness_level_id", level)
      .limit(1)
      .single()
  ).data!.id;
  const plan = (
    await client
      .from("user_plans")
      .insert({ user_id: uid, plan_template_id: template, status: "active" })
      .select()
      .single()
  ).data!;
  const tplDays = (
    await client.from("plan_template_days").select("*").eq("plan_template_id", template).order("day_number").limit(3)
  ).data!;
  await client.from("user_plan_days").insert(
    tplDays.map((td, i) => ({
      user_plan_id: plan.id,
      day_number: td.day_number,
      workout_id: td.workout_id,
      target_duration_seconds: td.target_duration_seconds,
      target_calories: td.target_calories,
      status: i === 0 ? "available" : "locked",
    }))
  );
  const days = (
    await client.from("user_plan_days").select("*").eq("user_plan_id", plan.id).order("day_number")
  ).data as Array<Record<string, unknown>>;
  return { planId: plan.id, days };
}

async function main() {
  const admin = createClient(URL, SERVICE);

  // Server reachable?
  const health = await fetch(BASE).catch(() => null);
  if (!health) {
    console.error(`Server unreachable at ${BASE}. Start with: PORT=${process.env.TEST_PORT ?? 3111} npm start`);
    process.exit(1);
  }

  console.log("\n=== E. /api/sync unauthenticated ===");
  {
    const r = await postSync("", {});
    check("unauthenticated POST rejected 401", r.status === 401, String(r.status));
    check("no internals leaked", !JSON.stringify(r.json).includes("postgres") && !JSON.stringify(r.json).toLowerCase().includes("stack"));
  }

  console.log("\n=== F. /api/sync validation & guards (User U) ===");
  const U = await provisionUser(admin, "u");
  const cookieU = authCookie(U.session);
  const { days } = await seedPlan(U.client, U.uid);
  const workoutId = days[0].workout_id as string;

  const validPayload = {
    operationId: `op-${Date.now()}`,
    operationType: "WORKOUT_COMPLETED",
    payload: {
      workoutSessionId: crypto.randomUUID(),
      workoutId,
      source: "plan",
      userPlanDayId: days[0].id,
      startedAt: new Date(Date.now() - 900_000).toISOString(),
      completedAt: new Date().toISOString(),
      durationSeconds: 600,
      estimatedCalories: 80,
      exercises: [],
    },
  };

  {
    const r = await postSync(cookieU, {
      operationId: "short",
      operationType: "WORKOUT_COMPLETED",
      payload: {},
    });
    check("malformed envelope -> 400", r.status === 400, `${r.status} ${JSON.stringify(r.json)}`);

    const badTs = structuredClone(validPayload);
    badTs.payload.startedAt = "definitely-not-a-date";
    badTs.operationId = badTs.operationId + "-ts";
    const rTs = await postSync(cookieU, badTs);
    check("invalid timestamp -> 400", rTs.status === 400);

    const bigDur = structuredClone(validPayload);
    bigDur.payload.durationSeconds = 86_400;
    bigDur.operationId = bigDur.operationId + "-dur";
    const rDur = await postSync(cookieU, bigDur);
    check("absurd duration -> 400", rDur.status === 400);

    const locked = structuredClone(validPayload);
    locked.payload.userPlanDayId = days[2].id; // Day 3 — locked
    locked.payload.workoutSessionId = crypto.randomUUID();
    locked.operationId = locked.operationId + "-lock";
    const rLock = await postSync(cookieU, locked);
    check(
      "locked plan day via sync -> 400",
      rLock.status === 400 && /Invalid plan day/.test(String(rLock.json.error)),
      `${rLock.status} ${JSON.stringify(rLock.json)}`
    );
  }

  console.log("\n=== G. Offline completion delivery & replay over HTTP ===");
  {
    const r1 = await postSync(cookieU, validPayload);
    check("valid queued completion accepted", r1.status === 200 && r1.json.ok === true, `${r1.status} ${JSON.stringify(r1.json)}`);

    const { data: d2 } = await U.client
      .from("user_plan_days")
      .select("status")
      .eq("id", days[1].id)
      .single();
    check("Day2 unlocked by synced completion", d2?.status === "available");

    const r2 = await postSync(cookieU, validPayload); // exact replay
    check("replayed operation accepted as no-op", r2.status === 200 && r2.json.ok === true);
    const { count } = await admin
      .from("notifications")
      .select("user_id", { count: "exact", head: true })
      .eq("user_id", U.uid)
      .eq("type", "workout_completed");
    check("exactly one notification after HTTP replay", count === 1, `got ${count}`);
  }

  console.log("\n=== H. Cross-user attack over HTTP (U attacks V) ===");
  {
    const V = await provisionUser(admin, "v");
    const vSession = crypto.randomUUID();
    await V.client.from("workout_sessions").insert({
      id: vSession,
      user_id: V.uid,
      workout_id: workoutId,
      source: "discover",
      started_at: new Date().toISOString(),
      status: "in_progress",
      client_operation_id: crypto.randomUUID(),
    });

    const attack = structuredClone(validPayload);
    attack.payload.workoutSessionId = vSession; // V's live session
    attack.payload.userPlanDayId = null;
    attack.payload.source = "discover";
    attack.operationId = attack.operationId + "-atk";
    const ra = await postSync(cookieU, attack);
    check(
      "foreign-session hijack fails closed (4xx/5xx, generic)",
      ra.status >= 400 && !JSON.stringify(ra.json).toLowerCase().includes("row-level"),
      `${ra.status} ${JSON.stringify(ra.json)}`
    );

    const { data: vRow } = await admin
      .from("workout_sessions")
      .select("status")
      .eq("id", vSession)
      .single();
    check("victim session untouched", vRow?.status === "in_progress", vRow?.status);

    await admin.auth.admin.deleteUser(V.uid);
  }

  await admin.auth.admin.deleteUser(U.uid);

  console.log(`\n=== RESULT: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
