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
