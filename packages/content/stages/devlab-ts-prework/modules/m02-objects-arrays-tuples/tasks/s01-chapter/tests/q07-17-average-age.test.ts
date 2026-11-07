// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { averageAge, type Cat, type Dog } from "../src/q07-17-average-age";
test("問17 averageAge", () => {
  const cat: Cat = { name: "ミケ", age: 3, meow: "ニャー" };
  const dog: Dog = { name: "ポチ", age: 5, breed: "柴" };
  expect(averageAge([cat, dog])).toBe(4);
  expect(averageAge([])).toBe(0);
  expectTypeOf(averageAge).parameters.toEqualTypeOf<[readonly { age: number }[]]>();
  expectTypeOf(averageAge).returns.toEqualTypeOf<number>();
});
