// このファイルは書き換えないでください
import { expectTypeOf, test } from "vitest";
import { type UserName } from "../src/q04-01-user-name";
test("問1 UserName", () => {
  expectTypeOf<UserName>().toEqualTypeOf<{ name: string }>();
});
