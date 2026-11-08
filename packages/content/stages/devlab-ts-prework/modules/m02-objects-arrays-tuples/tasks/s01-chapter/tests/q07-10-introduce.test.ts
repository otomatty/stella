// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { introduce, type Cat, type Dog } from "../src/q07-10-introduce";
test("問10 introduce", () => {
  const cat: Cat = { name: "ミケ", age: 3, meow: "ニャー" };
  const dog: Dog = { name: "ポチ", age: 5, breed: "柴" };
  expect(introduce(cat)).toBe("ミケ（3歳）");
  expect(introduce(dog)).toBe("ポチ（5歳）");
  expectTypeOf(introduce).parameters.toEqualTypeOf<[{ name: string; age: number }]>();
  expectTypeOf(introduce).returns.toEqualTypeOf<string>();
});
