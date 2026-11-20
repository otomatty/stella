// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { nameOf, type Cat, type Robot } from "../src/q07-01-name-of";
test("問1 nameOf", () => {
  const cat: Cat = { name: "ミケ", age: 3, meow: "ニャー" };
  const robot: Robot = { name: "R2", version: 2 };
  expect(nameOf(cat)).toBe("ミケ");
  expect(nameOf(robot)).toBe("R2");
  expectTypeOf(nameOf).parameters.toEqualTypeOf<[{ name: string }]>();
  expectTypeOf(nameOf).returns.toEqualTypeOf<string>();
});
