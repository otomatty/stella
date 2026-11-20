// このファイルは書き換えないでください
import { expectTypeOf, test } from "vitest";
import { type UserContact } from "../src/q04-02-user-contact";
test("問2 UserContact", () => {
  expectTypeOf<UserContact>().toEqualTypeOf<{ name: string; email: string }>();
});
