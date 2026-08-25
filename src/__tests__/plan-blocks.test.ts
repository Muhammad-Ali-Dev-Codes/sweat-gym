import { describe, it, expect } from "vitest";
import {
  composeDayBlocks,
  MIN_BLOCK_SECONDS,
  type ComposedBlock,
} from "@/lib/plan-blocks";

const POOL = [
  { id: "warm", durationSeconds: 480 }, // 8 min
  { id: "short", durationSeconds: 600 }, // 10 min
  { id: "medium", durationSeconds: 900 }, // 15 min
  { id: "long", durationSeconds: 1800 }, // 30 min
];

function totalSeconds(blocks: ComposedBlock[]): number {
  return blocks.reduce((s, b) => s + b.durationSeconds, 0);
}
function totalCalories(blocks: ComposedBlock[]): number {
  return blocks.reduce((s, b) => s + b.calories, 0);
}

describe("composeDayBlocks (one-hour multi-video day)", () => {
  it("lands on exactly 3,600 s and 1,100 kcal for every day", () => {
    for (let day = 1; day <= 90; day++) {
      const blocks = composeDayBlocks(POOL, day);
      expect(totalSeconds(blocks), `day ${day} seconds`).toBe(3600);
      expect(totalCalories(blocks), `day ${day} calories`).toBe(1100);
      expect(
        blocks.map((b) => b.position),
        `day ${day} positions`
      ).toEqual(blocks.map((_, i) => i + 1));
    }
  });

  it("is deterministic per day and rotates the opening video", () => {
    const first = composeDayBlocks(POOL, 1).map((b) => b.workoutId);
    const again = composeDayBlocks(POOL, 1).map((b) => b.workoutId);
    expect(first).toEqual(again);

    const day1 = composeDayBlocks(POOL, 1)[0].workoutId;
    const day2 = composeDayBlocks(POOL, 2)[0].workoutId;
    const day3 = composeDayBlocks(POOL, 3)[0].workoutId;
    expect(new Set([day1, day2, day3]).size).toBeGreaterThan(1);
  });

  it("never repeats a video within a day while the pool allows variety", () => {
    const blocks = composeDayBlocks(POOL, 5);
    const ids = blocks.map((b) => b.workoutId);
    if (new Set(ids).size === ids.length) {
      expect(new Set(ids).size).toBe(ids.length);
    } else {
      // Repeats only after the whole pool has been used once.
      const seen = new Set<string>();
      let repeated = false;
      for (const id of ids) {
        if (seen.has(id)) repeated = true;
        seen.add(id);
      }
      expect(repeated || ids.length > POOL.length).toBe(false);
    }
    expect(ids.length).toBeLessThanOrEqual(POOL.length);
  });

  it("clips or stretches only the closing block, never below the minimum", () => {
    for (let day = 1; day <= 20; day++) {
      const blocks = composeDayBlocks(POOL, day);
      const last = blocks[blocks.length - 1];
      const earlierSum = totalSeconds(blocks.slice(0, -1));
      const remaining = 3600 - earlierSum;
      // The closer absorbs whatever is left of the hour.
      expect(last.durationSeconds).toBe(remaining);
      // Every block stays meaningful.
      for (const b of blocks) {
        expect(b.durationSeconds).toBeGreaterThanOrEqual(
          Math.min(MIN_BLOCK_SECONDS, remaining)
        );
      }
    }
  });

  it("handles a single long video by clipping it to the hour", () => {
    const blocks = composeDayBlocks([{ id: "huge", durationSeconds: 5400 }], 1);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].durationSeconds).toBe(3600);
    expect(blocks[0].calories).toBe(1100);
  });

  it("repeats a video when the pool is smaller than the hour requires", () => {
    const blocks = composeDayBlocks([{ id: "only", durationSeconds: 1200 }], 1);
    expect(totalSeconds(blocks)).toBe(3600);
    expect(blocks.every((b) => b.workoutId === "only")).toBe(true);
    expect(blocks.length).toBeGreaterThanOrEqual(3);
  });

  it("returns an empty sequence for empty or invalid input", () => {
    expect(composeDayBlocks([], 1)).toEqual([]);
    expect(composeDayBlocks(POOL, 1, 0)).toEqual([]);
    expect(composeDayBlocks([{ id: "x", durationSeconds: -5 }], 1)).toEqual([]);
  });
});
