import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Migration contract tests.
 *
 * The application's security and integrity guarantees depend on specific
 * database objects existing. These tests pin those objects to the migration
 * files so an accidental regression (dropped guard, missing index) fails
 * the test suite instead of surfacing as a production incident.
 */

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

function allMigrations(): Map<string, string> {
  const files = readdirSync(MIGRATIONS_DIR).filter((f) =>
    f.endsWith(".sql")
  );
  return new Map(
    files.map((f) => [f, readFileSync(join(MIGRATIONS_DIR, f), "utf8")])
  );
}

describe("migration contracts", () => {
  const migrations = allMigrations();
  const combined = Array.from(migrations.values()).join("\n");

  it("has migration files to verify", () => {
    expect(migrations.size).toBeGreaterThan(20);
  });

  it("enables RLS on every user-data table", () => {
    const userTables = [
      "profiles",
      "fitness_profiles",
      "user_physical_restrictions",
      "weight_entries",
      "user_plans",
      "user_plan_days",
      "user_plan_day_blocks",
      "workout_sessions",
      "workout_exercise_sessions",
      "favorite_workouts",
      "push_subscriptions",
      "notification_preferences",
      "sync_operations",
      "notifications",
      "user_achievements",
    ];
    for (const table of userTables) {
      const re = new RegExp(
        `ALTER\\s+TABLE\\s+${table}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`,
        "i"
      );
      expect(re.test(combined), `RLS not enabled for ${table}`).toBe(true);
    }
  });

  it("guards workout completion behind the ownership-checked RPC trigger", () => {
    expect(combined).toMatch(/enforce_server_side_completion/);
    // Client roles must never write 'completed' directly.
    expect(combined).toMatch(/current_user IN \('anon', 'authenticated'\)/);
  });

  it("keeps the completion RPC fail-closed for anonymous callers", () => {
    // 0017/0020 hardening: explicit NULL check + IS DISTINCT FROM guard.
    expect(combined).toMatch(/IF auth\.uid\(\) IS NULL THEN/);
    expect(combined).toMatch(/v_user_id IS DISTINCT FROM auth\.uid\(\)/);
  });

  it("rejects completions bound to locked plan days", () => {
    expect(migrations.get("0022_rpc_locked_day_guard.sql")).toBeTruthy();
    const sql = migrations.get("0022_rpc_locked_day_guard.sql") ?? "";
    expect(sql).toMatch(/status = 'locked'/);
    expect(sql).toMatch(/fail closed/i);
  });

  it("enforces at most one active plan and one open session per user", () => {
    expect(combined).toMatch(/CREATE\s+UNIQUE\s+INDEX[^;]*user_plans/i);
    // Partial unique index for in-progress sessions (QA-M1).
    expect(combined).toMatch(
      /CREATE\s+UNIQUE\s+INDEX[^;]*workout_sessions[\s\S]*?status = 'in_progress'/i
    );
  });

  it("constrains plan duration and planned loss to the supported tiers", () => {
    expect(combined).toMatch(/plan_duration_days IN \(30, ?60, ?90\)/);
    expect(combined).toMatch(/planned_loss_kg >= 0 AND planned_loss_kg <= 12/);
  });

  it("dedupes notifications with unique (user_id, type, dedupe_key)", () => {
    expect(combined).toMatch(
      /UNIQUE\s*\(\s*user_id,\s*type,\s*dedupe_key\s*\)/i
    );
  });

  it("drops the legacy unguarded complete_plan_day helper", () => {
    // QA-C2: SECURITY DEFINER function without an ownership check was a
    // cross-user completion vector; it must stay dropped.
    expect(combined).toMatch(/DROP FUNCTION IF EXISTS[^(]*complete_plan_day/i);
  });

  it("migrations are numbered in ascending order", () => {
    const numbers = Array.from(migrations.keys())
      .map((f) => parseInt(f.slice(0, 4), 10))
      .sort((a, b) => a - b);
    expect(numbers.length).toBeGreaterThan(20);
    // No duplicate numbers.
    expect(new Set(numbers).size).toBe(numbers.length);
  });
});

describe("plan-day edit RPC contracts", () => {
  const migrations = allMigrations();
  // 0040 introduces save_user_plan_day_workout; 0042 re-pins it with cleaner
  // display-name handling and hardening. 0043 adds reset_plan_day_workout.
  const save = [
    migrations.get("0040_user_plan_day_edits.sql") ?? "",
    migrations.get("0042_clean_edited_workout_names.sql") ?? "",
  ].join("\n");
  const reset = migrations.get("0043_reset_plan_day_edits.sql") ?? "";
  const combined = Array.from(migrations.values()).join("\n");

  it("defines the save and reset RPCs", () => {
    expect(combined).toMatch(/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+save_user_plan_day_workout/i);
    expect(combined).toMatch(/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+reset_plan_day_workout/i);
  });

  it("scopes every plan-day edit to the owning user (multi-tenant isolation)", () => {
    // Scenario 2: User B must never see/alter A's customization. Both RPCs
    // join through user_plans and hard-check auth.uid() as the owner.
    expect(save).toMatch(/AND\s+p\.user_id\s*=\s*auth\.uid\(\)/i);
    expect(reset).toMatch(/AND\s+p\.user_id\s*=\s*auth\.uid\(\)/i);
  });

  it("touches exactly the addressed plan day (no cross-day leakage)", () => {
    // Scenario 3: editing Day 3 must not affect Day 4.
    expect(reset).toMatch(
      /UPDATE\s+user_plan_days[\s\S]*?WHERE\s+id\s*=\s*p_plan_day_id/i
    );
  });

  it("fails closed when the plan day is not found or not owned", () => {
    expect(save).toMatch(/IF\s+NOT\s+FOUND\s+THEN\s+RAISE\s+EXCEPTION\s+'Plan day not found'/i);
    expect(reset).toMatch(/IF\s+NOT\s+FOUND\s+THEN\s+RAISE\s+EXCEPTION\s+'Plan day not found'/i);
  });

  it("validates set/rest/reps prescription before persisting", () => {
    // Scenario 5: sets and rest now have real controls; the RPC must reject
    // sets < 1, rest < 0, and non-positive reps/duration.
    expect(save).toMatch(/sets'\)::INT, 0\)\s*<\s*1/i);
    expect(save).toMatch(/restSeconds'\)::INT, -1\)\s*<\s*0/i);
    expect(save).toMatch(/'Invalid exercise prescription'/i);
  });

  it("reset restores the original default block, not a stale edit", () => {
    // Scenario 4: reset must restore from user_plan_day_blocks position 1
    // (the immutable original), never from the currently repointed workout_id.
    expect(reset).toMatch(/FROM\s+user_plan_day_blocks\s+b[\s\S]*?ORDER\s+BY\s+b\.position[\s\S]*?LIMIT\s+1/i);
  });

  it("guards reset to unopened (locked/available) plan days only", () => {
    // Reset is destructive; it must refuse in-progress/completed days.
    expect(reset).toMatch(/status\s+NOT\s+IN\s+\('locked',\s*'available'\)/i);
    expect(reset).toMatch(/RAISE\s+EXCEPTION\s+'Only\s+unopened\s+plan\s+days\s+can\s+be\s+reset'/i);
  });

  it("requires an original block to exist before resetting", () => {
    expect(reset).toMatch(/blocks_count\s*=\s*0/i);
    expect(reset).toMatch(/RAISE\s+EXCEPTION\s+'No\s+original\s+workout\s+recorded'|'Original\s+workout\s+not\s+found'/i);
  });

  it("never grants plan-day edit RPCs to the PUBLIC role", () => {
    // Execution must be limited to authenticated users only.
    expect(save).toMatch(/REVOKE\s+ALL\s+ON\s+FUNCTION\s+save_user_plan_day_workout/i);
    expect(save).toMatch(/GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+save_user_plan_day_workout[^;]*TO\s+authenticated/i);
    expect(reset).toMatch(/REVOKE\s+ALL\s+ON\s+FUNCTION\s+reset_plan_day_workout/i);
    expect(reset).toMatch(/GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+reset_plan_day_workout[^;]*TO\s+authenticated/i);
  });
});
