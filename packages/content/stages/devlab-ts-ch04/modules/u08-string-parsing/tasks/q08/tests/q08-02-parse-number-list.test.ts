// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { parseNumberList } from "../src/q08-02-parse-number-list";
test("問2 parseNumberList", () => {
  expect(parseNumberList("1, 2,3")).toEqual([1, 2, 3]);
  expect(() => parseNumberList("1,x,3")).toThrow("数値ではありません: x");
  expectTypeOf(parseNumberList).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(parseNumberList).returns.toEqualTypeOf<number[]>();
});
