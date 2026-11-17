// このファイルは書き換えないでください
import { expectTypeOf, test } from "vitest";
import { type DefaultUser } from "../src/q01-01-default-user";
test("問1 DefaultUser", () => {
  expectTypeOf<DefaultUser>().toEqualTypeOf<{ name: string; age: number; admin: boolean }>();
});
