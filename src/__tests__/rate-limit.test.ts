import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { rateLimit } from "@/lib/rate-limit";

describe("rateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows calls under the limit", () => {
    for (let i = 0; i < 5; i++) {
      const result = rateLimit("key-a", 5, 60_000);
      expect(result.ok).toBe(true);
    }
    expect(rateLimit("key-a", 5, 60_000).remaining).toBe(0);
  });

  it("blocks the call that exceeds the limit and reports retry-after", () => {
    for (let i = 0; i < 3; i++) rateLimit("key-b", 3, 60_000);

    const blocked = rateLimit("key-b", 3, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it("resets after the window elapses", () => {
    for (let i = 0; i < 2; i++) rateLimit("key-c", 2, 10_000);
    expect(rateLimit("key-c", 2, 10_000).ok).toBe(false);

    vi.advanceTimersByTime(10_001);
    const fresh = rateLimit("key-c", 2, 10_000);
    expect(fresh.ok).toBe(true);
    expect(fresh.remaining).toBe(1);
  });

  it("isolates keys from each other", () => {
    rateLimit("user-1", 1, 60_000);
    expect(rateLimit("user-1", 1, 60_000).ok).toBe(false);
    expect(rateLimit("user-2", 1, 60_000).ok).toBe(true);
  });
});
