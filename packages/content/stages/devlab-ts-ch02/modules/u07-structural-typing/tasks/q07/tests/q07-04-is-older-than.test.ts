// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isOlderThan, type Dog } from "../src/q07-04-is-older-than";
test("問4 isOlderThan", () => {
  const dog: Dog = { name: "ポチ", age: 5, breed: "柴" };
  expect(isOlderThan(dog, 3)).toBe(true);
  expect(isOlderThan(dog, 5)).toBe(false);
  expectTypeOf(isOlderThan).parameters.toEqualTypeOf<[{ age: number }, number]>();
  expectTypeOf(isOlderThan).returns.toEqualTypeOf<boolean>();
});
