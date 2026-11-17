// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { requireEmail, type Profile } from "../src/q03-13-require-email";
test("問13 requireEmail", () => {
  expect(requireEmail({ name: "山田", email: "y@example.com" })).toBe("y@example.com");
  expect(() => requireEmail({ name: "山田" })).toThrow("email がありません");
  expectTypeOf(requireEmail).parameters.toEqualTypeOf<[Profile]>();
  expectTypeOf(requireEmail).returns.toEqualTypeOf<string>();
});
