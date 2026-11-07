// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { bigger } from "../src/q03-14-bigger";
test("問14 bigger", () => {
  expect(bigger(3, 8)).toBe(8);
  expect(bigger(9, 2)).toBe(9);
  expectTypeOf(bigger).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(bigger).returns.toEqualTypeOf<number>();
});
