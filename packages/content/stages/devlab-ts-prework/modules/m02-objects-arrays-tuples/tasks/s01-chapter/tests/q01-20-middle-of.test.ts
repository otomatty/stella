// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { middleOf } from "../src/q01-20-middle-of";
test("問20 middleOf", () => {
  expect(middleOf({ start: 2, end: 8 })).toBe(5);
  expect(middleOf({ start: 0, end: 1 })).toBe(0.5);
  expectTypeOf(middleOf).parameters.toEqualTypeOf<[{ start: number; end: number }]>();
  expectTypeOf(middleOf).returns.toEqualTypeOf<number>();
});
