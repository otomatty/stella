// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { contactText, type Contact } from "../src/q04-19-contact-text";
test("問19 contactText", () => {
  expectTypeOf<Contact>().toEqualTypeOf<
    { by: "email"; address: string } | { by: "phone"; number: string }
  >();
  expect(contactText({ by: "email", address: "a@example.com" })).toBe("メール: a@example.com");
  expect(contactText({ by: "phone", number: "090-0000-0000" })).toBe("電話: 090-0000-0000");
  expectTypeOf(contactText).parameters.toEqualTypeOf<[Contact]>();
  expectTypeOf(contactText).returns.toEqualTypeOf<string>();
});
