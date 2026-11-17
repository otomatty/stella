// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { positionsOf } from "../src/q03-11-positions-of";
test("問11 positionsOf", () => {
  expect(positionsOf("banana", "a")).toEqual([1, 3, 5]);
  expect(positionsOf("banana", "z")).toEqual([]);
  expectTypeOf(positionsOf).parameters.toEqualTypeOf<[string, string]>();
  expectTypeOf(positionsOf).returns.toEqualTypeOf<number[]>();
});
