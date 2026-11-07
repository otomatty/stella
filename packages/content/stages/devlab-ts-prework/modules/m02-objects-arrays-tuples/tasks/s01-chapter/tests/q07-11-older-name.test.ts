// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { olderName, type Cat, type Dog } from "../src/q07-11-older-name";
test("問11 olderName", () => {
  const cat: Cat = { name: "ミケ", age: 3, meow: "ニャー" };
  const dog: Dog = { name: "ポチ", age: 5, breed: "柴" };
  expect(olderName(cat, dog)).toBe("ポチ");
  expect(olderName(dog, cat)).toBe("ポチ");
  expectTypeOf(olderName).parameters.toEqualTypeOf<
    [{ name: string; age: number }, { name: string; age: number }]
  >();
  expectTypeOf(olderName).returns.toEqualTypeOf<string>();
});
