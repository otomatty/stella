// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { filterNumbers } from "../src/q07-02-filter-numbers";
test("問2 filterNumbers", () => {
  expect(filterNumbers([1, 2, 3, 4], (n) => n % 2 === 0)).toEqual([2, 4]);
  expectTypeOf(filterNumbers).parameters.toEqualTypeOf<
    [readonly number[], (n: number) => boolean]
  >();
  expectTypeOf(filterNumbers).returns.toEqualTypeOf<number[]>();
});
