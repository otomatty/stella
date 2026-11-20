// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { wait } from "../src/q01-03-wait";
afterEach(() => {
  vi.useRealTimers();
});

test("問3 wait", async () => {
  vi.useFakeTimers();
  let done = false;
  void wait(100).then(() => {
    done = true;
  });
  await vi.advanceTimersByTimeAsync(99);
  expect(done).toBe(false);
  await vi.advanceTimersByTimeAsync(1);
  expect(done).toBe(true);
  expectTypeOf(wait).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(wait).returns.toEqualTypeOf<Promise<void>>();
});
