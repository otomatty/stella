// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { parseRange } from "../src/q08-08-parse-range";
test("問8 parseRange", () => {
  expect(parseRange("3-7")).toEqual([3, 7]);
  expect(() => parseRange("7-3")).toThrow("範囲ではありません: 7-3");
  expect(() => parseRange("a-b")).toThrow("範囲ではありません: a-b");
  expectTypeOf(parseRange).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(parseRange).returns.toEqualTypeOf<[number, number]>();
});
