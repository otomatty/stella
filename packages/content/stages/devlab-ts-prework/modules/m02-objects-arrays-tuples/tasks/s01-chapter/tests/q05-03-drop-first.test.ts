// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { dropFirst } from "../src/q05-03-drop-first";
test("問3 dropFirst", () => {
  const items = ["a", "b", "c"];
  expect(dropFirst(items)).toEqual(["b", "c"]);
  expect(dropFirst([])).toEqual([]);
  expect(items).toEqual(["a", "b", "c"]);
  expectTypeOf(dropFirst).parameters.toEqualTypeOf<[readonly string[]]>();
  expectTypeOf(dropFirst).returns.toEqualTypeOf<string[]>();
});
