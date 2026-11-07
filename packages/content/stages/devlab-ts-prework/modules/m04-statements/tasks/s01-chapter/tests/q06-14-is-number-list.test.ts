// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isNumberList } from "../src/q06-14-is-number-list";
test("問14 isNumberList", () => {
  expect(isNumberList([1, 2])).toBe(true);
  expect(isNumberList([1, "2"])).toBe(false);
  expect(isNumberList([])).toBe(true);
  expect(isNumberList("12")).toBe(false);
  expectTypeOf(isNumberList).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(isNumberList).returns.toEqualTypeOf<boolean>();
});
