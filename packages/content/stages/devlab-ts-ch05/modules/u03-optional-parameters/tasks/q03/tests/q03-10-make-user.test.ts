// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { makeUser } from "../src/q03-10-make-user";
test("問10 makeUser", () => {
  expect(makeUser("山田", 30)).toStrictEqual({ name: "山田", age: 30 });
  expect(makeUser("山田")).toStrictEqual({ name: "山田" });
  expectTypeOf(makeUser).parameters.toEqualTypeOf<[string, number?]>();
  expectTypeOf(makeUser).returns.toEqualTypeOf<{ name: string; age?: number }>();
});
