// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { lastLoginText } from "../src/q03-20-last-login-text";
test("問20 lastLoginText", () => {
  expect(lastLoginText({ lastLoginAt: new Date("2026-12-01T09:00:00Z") })).toBe("2026-12-01");
  expect(lastLoginText({ lastLoginAt: null })).toBe("未ログイン");
  expectTypeOf(lastLoginText).parameters.toEqualTypeOf<[{ lastLoginAt: Date | null }]>();
  expectTypeOf(lastLoginText).returns.toEqualTypeOf<string>();
});
