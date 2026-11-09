// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { nameLength, type Dog } from "../src/q07-02-name-length";
test("問2 nameLength", () => {
  const dog: Dog = { name: "ポチ", age: 5, breed: "柴" };
  expect(nameLength(dog)).toBe(2);
  expectTypeOf(nameLength).parameters.toEqualTypeOf<[{ name: string }]>();
  expectTypeOf(nameLength).returns.toEqualTypeOf<number>();
});
