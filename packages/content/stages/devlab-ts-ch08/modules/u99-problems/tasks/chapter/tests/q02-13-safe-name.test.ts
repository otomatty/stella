// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { safeName } from "../src/q02-13-safe-name";
afterEach(() => {
  vi.useRealTimers();
});

test("問13 safeName", async () => {
  await expect(safeName(1)).resolves.toBe("山田");
  await expect(safeName(9)).resolves.toBe("不明");
  expectTypeOf(safeName).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(safeName).returns.toEqualTypeOf<Promise<string>>();
});
