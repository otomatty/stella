// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { wait, withTimeout, type Task } from "../src/q04-12-with-timeout";
afterEach(() => {
  vi.useRealTimers();
});

test("問12 withTimeout", async () => {
  vi.useFakeTimers();
  const slow = async () => {
    await wait(200);
    return 1;
  };
  const quick = async () => {
    await wait(50);
    return 2;
  };
  const ok = withTimeout(quick, 100);
  await vi.advanceTimersByTimeAsync(50);
  await expect(ok).resolves.toBe(2);
  const ng = withTimeout(slow, 100);
  const check = expect(ng).rejects.toThrow("タイムアウトしました");
  await vi.advanceTimersByTimeAsync(100);
  await check;
  expectTypeOf(withTimeout).parameters.toEqualTypeOf<[Task, number]>();
  expectTypeOf(withTimeout).returns.toEqualTypeOf<Promise<number>>();
});
