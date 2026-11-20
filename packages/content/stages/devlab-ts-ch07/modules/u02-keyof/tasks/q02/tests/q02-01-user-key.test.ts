// このファイルは書き換えないでください
import { expectTypeOf, test } from "vitest";
import { type UserKey } from "../src/q02-01-user-key";
test("問1 UserKey", () => {
  expectTypeOf<UserKey>().toEqualTypeOf<"id" | "name" | "email" | "age">();
});
