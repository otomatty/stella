// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { mergeCounts } from "../src/q08-14-merge-counts";
test("問14 mergeCounts", () => {
  expect(mergeCounts({ a: 1, b: 2 }, { b: 3, c: 4 })).toEqual({ a: 1, b: 5, c: 4 });
  expectTypeOf(mergeCounts).parameters.toEqualTypeOf<
    [{ [key: string]: number }, { [key: string]: number }]
  >();
  expectTypeOf(mergeCounts).returns.toEqualTypeOf<{ [key: string]: number }>();
});
