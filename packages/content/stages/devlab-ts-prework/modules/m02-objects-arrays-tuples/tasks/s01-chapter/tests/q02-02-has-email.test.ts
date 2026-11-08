// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { hasEmail } from "../src/q02-02-has-email";
test("問2 hasEmail", () => {
  expect(hasEmail({ email: "a@example.com" })).toBe(true);
  expect(hasEmail({})).toBe(false);
  expectTypeOf(hasEmail).parameters.toEqualTypeOf<[{ email?: string }]>();
  expectTypeOf(hasEmail).returns.toEqualTypeOf<boolean>();
});
