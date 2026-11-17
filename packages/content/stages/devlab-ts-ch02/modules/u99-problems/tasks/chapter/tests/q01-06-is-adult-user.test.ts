// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isAdultUser } from "../src/q01-06-is-adult-user";
test("問6 isAdultUser", () => {
  expect(isAdultUser({ name: "山田", age: 30 })).toBe(true);
  expect(isAdultUser({ name: "佐藤", age: 17 })).toBe(false);
  expectTypeOf(isAdultUser).parameters.toEqualTypeOf<[{ name: string; age: number }]>();
  expectTypeOf(isAdultUser).returns.toEqualTypeOf<boolean>();
});
