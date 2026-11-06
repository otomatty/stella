import { afterEach, describe, expect, expectTypeOf, test, vi } from "vitest";
import { mapWithLimit } from "../src/e01-concurrency-limit";

afterEach(() => {
  vi.useRealTimers();
});

// 実行中の数を数えながら、ms ミリ秒後に value を返す
const createTracker = () => {
  const state = { running: 0, max: 0, started: [] as string[] };
  const run = (value: string, ms: number) =>
    new Promise<string>((resolve) => {
      state.running += 1;
      state.max = Math.max(state.max, state.running);
      state.started.push(value);
      setTimeout(() => {
        state.running -= 1;
        resolve(value.toUpperCase());
      }, ms);
    });
  return { state, run };
};

describe("mapWithLimit", () => {
  test("結果は items の順", async () => {
    vi.useFakeTimers();
    const { run } = createTracker();
    const durations: Record<string, number> = { a: 30, b: 10, c: 20, d: 5 };
    const result = mapWithLimit(["a", "b", "c", "d"], 2, (s) => run(s, durations[s] ?? 0));
    await vi.runAllTimersAsync();
    await expect(result).resolves.toEqual(["A", "B", "C", "D"]);
  });

  test("同時に limit 個を超えない", async () => {
    vi.useFakeTimers();
    const { state, run } = createTracker();
    const items = ["a", "b", "c", "d", "e", "f", "g"];
    const result = mapWithLimit(items, 3, (s) => run(s, 10));
    await vi.runAllTimersAsync();
    await expect(result).resolves.toHaveLength(7);
    expect(state.max).toBe(3);
  });

  test("1つ終わったら、すぐに次を始める", async () => {
    vi.useFakeTimers();
    const { state, run } = createTracker();
    const durations: Record<string, number> = { a: 100, b: 10, c: 10 };
    const result = mapWithLimit(["a", "b", "c"], 2, (s) => run(s, durations[s] ?? 0));
    await vi.advanceTimersByTimeAsync(10);
    expect(state.started).toEqual(["a", "b", "c"]);
    await vi.runAllTimersAsync();
    await result;
  });

  test("失敗したら、その失敗を投げる", async () => {
    const fn = async (n: number) => {
      await Promise.resolve();
      if (n === 3) {
        throw new Error("3 は失敗");
      }
      return n * 2;
    };
    await expect(mapWithLimit([1, 2, 3, 4], 2, fn)).rejects.toThrow("3 は失敗");
    await expect(mapWithLimit([1, 2], 2, fn)).resolves.toEqual([2, 4]);
  });

  test("limit が1未満なら Error", async () => {
    await expect(mapWithLimit([1], 0, (n) => Promise.resolve(n))).rejects.toThrow(Error);
  });

  test("空の配列", async () => {
    await expect(mapWithLimit([], 2, (n: number) => Promise.resolve(n))).resolves.toEqual([]);
  });

  test("型", () => {
    expectTypeOf(mapWithLimit([1, 2], 1, (n) => Promise.resolve(String(n)))).toEqualTypeOf<
      Promise<string[]>
    >();
  });
});
