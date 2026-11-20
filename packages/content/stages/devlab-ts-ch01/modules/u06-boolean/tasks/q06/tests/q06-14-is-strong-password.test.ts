// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isStrongPassword } from "../src/q06-14-is-strong-password";
test("問14 isStrongPassword", () => {
  expect(isStrongPassword("Agora2026")).toBe(true);
  expect(isStrongPassword("agora2026")).toBe(false);
  expect(isStrongPassword("Agora")).toBe(false);
  expect(isStrongPassword("AgoraAgora")).toBe(false);
  expectTypeOf(isStrongPassword).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(isStrongPassword).returns.toEqualTypeOf<boolean>();
});
