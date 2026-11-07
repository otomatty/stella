// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { getAge } from "../src/q01-02-get-age";
test("問2 getAge", () => {
  expect(getAge({ name: "山田", age: 30 })).toBe(30);
  expectTypeOf(getAge).parameters.toEqualTypeOf<[{ name: string; age: number }]>();
  expectTypeOf(getAge).returns.toEqualTypeOf<number>();
});
