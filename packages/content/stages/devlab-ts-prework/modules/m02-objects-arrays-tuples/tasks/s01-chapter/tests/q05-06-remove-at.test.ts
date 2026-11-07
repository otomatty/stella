// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { removeAt } from "../src/q05-06-remove-at";
test("問6 removeAt", () => {
  const items = ["a", "b", "c"];
  expect(removeAt(items, 1)).toEqual(["a", "c"]);
  expect(items).toEqual(["a", "b", "c"]);
  expectTypeOf(removeAt).parameters.toEqualTypeOf<[readonly string[], number]>();
  expectTypeOf(removeAt).returns.toEqualTypeOf<string[]>();
});
