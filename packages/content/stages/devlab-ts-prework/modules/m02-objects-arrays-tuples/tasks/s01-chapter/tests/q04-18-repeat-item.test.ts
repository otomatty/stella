// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { repeatItem } from "../src/q04-18-repeat-item";
test("問18 repeatItem", () => {
  expect(repeatItem("x", 3)).toEqual(["x", "x", "x"]);
  expect(repeatItem("x", 0)).toEqual([]);
  expectTypeOf(repeatItem).parameters.toEqualTypeOf<[string, number]>();
  expectTypeOf(repeatItem).returns.toEqualTypeOf<string[]>();
});
