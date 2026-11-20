// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { ageNextYear, type Cat, type Dog } from "../src/q07-03-age-next-year";
test("問3 ageNextYear", () => {
  const cat: Cat = { name: "ミケ", age: 3, meow: "ニャー" };
  const dog: Dog = { name: "ポチ", age: 5, breed: "柴" };
  expect(ageNextYear(cat)).toBe(4);
  expect(ageNextYear(dog)).toBe(6);
  expectTypeOf(ageNextYear).parameters.toEqualTypeOf<[{ age: number }]>();
  expectTypeOf(ageNextYear).returns.toEqualTypeOf<number>();
});
