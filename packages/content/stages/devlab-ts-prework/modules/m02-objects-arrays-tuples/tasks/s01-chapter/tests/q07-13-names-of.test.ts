// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { namesOf, type Cat, type Dog, type Robot } from "../src/q07-13-names-of";
test("問13 namesOf", () => {
  const cat: Cat = { name: "ミケ", age: 3, meow: "ニャー" };
  const dog: Dog = { name: "ポチ", age: 5, breed: "柴" };
  const robot: Robot = { name: "R2", version: 2 };
  expect(namesOf([cat, dog, robot])).toEqual(["ミケ", "ポチ", "R2"]);
  expectTypeOf(namesOf).parameters.toEqualTypeOf<[readonly { name: string }[]]>();
  expectTypeOf(namesOf).returns.toEqualTypeOf<string[]>();
});
