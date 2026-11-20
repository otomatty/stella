// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { oldest } from "../src/q07-11-oldest";
test("問11 oldest", () => {
  const people = [
    { name: "a", age: 30 },
    { name: "b", age: 41 },
  ];
  expect(oldest(people)).toEqual({ name: "b", age: 41 });
  expectTypeOf(oldest(people)).toEqualTypeOf<{ name: string; age: number } | undefined>();
});
