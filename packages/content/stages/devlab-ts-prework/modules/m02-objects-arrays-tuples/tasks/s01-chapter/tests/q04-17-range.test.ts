// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { range } from "../src/q04-17-range";
test("問17 range", () => {
  expect(range(2, 5)).toEqual([2, 3, 4]);
  expect(range(3, 3)).toEqual([]);
  expectTypeOf(range).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(range).returns.toEqualTypeOf<number[]>();
});
