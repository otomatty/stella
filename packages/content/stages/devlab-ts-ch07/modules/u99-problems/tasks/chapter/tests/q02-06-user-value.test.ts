// このファイルは書き換えないでください
import { expectTypeOf, test } from "vitest";
import { type UserValue } from "../src/q02-06-user-value";
test("問6 UserValue", () => {
  expectTypeOf<UserValue>().toEqualTypeOf<string | number>();
});
