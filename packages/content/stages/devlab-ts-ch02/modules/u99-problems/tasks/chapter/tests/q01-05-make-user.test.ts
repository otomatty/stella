// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { makeUser } from "../src/q01-05-make-user";
test("問5 makeUser", () => {
  expect(makeUser("山田", 30)).toEqual({ name: "山田", age: 30 });
  expectTypeOf(makeUser).parameters.toEqualTypeOf<[string, number]>();
  expectTypeOf(makeUser).returns.toEqualTypeOf<{ name: string; age: number }>();
});
