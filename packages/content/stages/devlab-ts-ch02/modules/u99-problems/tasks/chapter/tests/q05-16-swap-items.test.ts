// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { swapItems } from "../src/q05-16-swap-items";
test("問16 swapItems", () => {
  const items = ["a", "b", "c"];
  expect(swapItems(items, 0, 2)).toEqual(["c", "b", "a"]);
  expect(items).toEqual(["a", "b", "c"]);
  expect(() => swapItems(items, 0, 3)).toThrow(Error);
  expectTypeOf(swapItems).parameters.toEqualTypeOf<[readonly string[], number, number]>();
  expectTypeOf(swapItems).returns.toEqualTypeOf<string[]>();
});
