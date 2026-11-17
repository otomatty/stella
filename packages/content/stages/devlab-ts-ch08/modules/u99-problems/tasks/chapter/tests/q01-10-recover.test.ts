// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { recover } from "../src/q01-10-recover";
afterEach(() => {
  vi.useRealTimers();
});

test("問10 recover", async () => {
  await expect(recover(Promise.resolve(5))).resolves.toBe(5);
  await expect(recover(Promise.reject(new Error("x")))).resolves.toBe(0);
  expectTypeOf(recover).parameters.toEqualTypeOf<[Promise<number>]>();
  expectTypeOf(recover).returns.toEqualTypeOf<Promise<number>>();
});
