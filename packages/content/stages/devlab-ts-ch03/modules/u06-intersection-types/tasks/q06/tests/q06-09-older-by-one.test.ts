// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { olderByOne, type Named, type Aged } from "../src/q06-09-older-by-one";
test("問9 olderByOne", () => {
  const person = { name: "山田", age: 30 };
  expect(olderByOne(person)).toEqual({ name: "山田", age: 31 });
  expect(person.age).toBe(30);
  expectTypeOf(olderByOne).parameters.toEqualTypeOf<[Named & Aged]>();
  expectTypeOf(olderByOne).returns.toEqualTypeOf<Named & Aged>();
});
