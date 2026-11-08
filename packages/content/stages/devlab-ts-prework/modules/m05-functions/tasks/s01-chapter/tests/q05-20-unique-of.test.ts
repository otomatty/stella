// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { uniqueOf } from "../src/q05-20-unique-of";
test("問20 uniqueOf", () => {
  expect(uniqueOf("a", "b", "a")).toEqual(["a", "b"]);
  expect(uniqueOf()).toEqual([]);
  expectTypeOf(uniqueOf).parameters.toEqualTypeOf<string[]>();
  expectTypeOf(uniqueOf).returns.toEqualTypeOf<string[]>();
});
