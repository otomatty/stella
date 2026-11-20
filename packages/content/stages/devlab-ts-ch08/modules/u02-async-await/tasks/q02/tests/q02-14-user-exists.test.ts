// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { userExists } from "../src/q02-14-user-exists";
afterEach(() => {
  vi.useRealTimers();
});

test("問14 userExists", async () => {
  await expect(userExists(1)).resolves.toBe(true);
  await expect(userExists(9)).resolves.toBe(false);
  expectTypeOf(userExists).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(userExists).returns.toEqualTypeOf<Promise<boolean>>();
});
