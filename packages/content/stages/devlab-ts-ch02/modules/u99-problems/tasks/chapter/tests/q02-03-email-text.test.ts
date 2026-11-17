// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { emailText } from "../src/q02-03-email-text";
test("問3 emailText", () => {
  expect(emailText({ email: "a@example.com" })).toBe("a@example.com");
  expect(emailText({})).toBe("（未登録）");
  expectTypeOf(emailText).parameters.toEqualTypeOf<[{ email?: string }]>();
  expectTypeOf(emailText).returns.toEqualTypeOf<string>();
});
