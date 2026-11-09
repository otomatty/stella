// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { countSet, type Options } from "../src/q03-10-count-set";
test("問10 countSet", () => {
  expect(countSet({ size: 1, bold: false })).toBe(2);
  expect(countSet({})).toBe(0);
  expectTypeOf(countSet).parameters.toEqualTypeOf<[Partial<Options>]>();
  expectTypeOf(countSet).returns.toEqualTypeOf<number>();
});
