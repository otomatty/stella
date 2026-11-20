// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { percentOf } from "../src/q04-13-percent-of";
test("問13 percentOf", () => {
  expect(percentOf(1, 3)).toBe(33);
  expect(percentOf(2, 3)).toBe(67);
  expect(percentOf(5, 5)).toBe(100);
  expectTypeOf(percentOf).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(percentOf).returns.toEqualTypeOf<number>();
});
