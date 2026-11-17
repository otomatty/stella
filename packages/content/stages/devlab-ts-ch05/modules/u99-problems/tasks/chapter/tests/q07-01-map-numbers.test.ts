// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { mapNumbers } from "../src/q07-01-map-numbers";
test("問1 mapNumbers", () => {
  expect(mapNumbers([1, 2], (n) => n * 10)).toEqual([10, 20]);
  expectTypeOf(mapNumbers).parameters.toEqualTypeOf<[readonly number[], (n: number) => number]>();
  expectTypeOf(mapNumbers).returns.toEqualTypeOf<number[]>();
});
