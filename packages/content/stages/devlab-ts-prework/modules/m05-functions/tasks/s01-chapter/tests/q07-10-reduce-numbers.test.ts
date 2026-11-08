// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { reduceNumbers } from "../src/q07-10-reduce-numbers";
test("問10 reduceNumbers", () => {
  expect(reduceNumbers([1, 2, 3], (acc, n) => acc + n, 0)).toBe(6);
  expect(reduceNumbers([2, 3], (acc, n) => acc * n, 1)).toBe(6);
  expectTypeOf(reduceNumbers).parameters.toEqualTypeOf<
    [readonly number[], (acc: number, n: number) => number, number]
  >();
  expectTypeOf(reduceNumbers).returns.toEqualTypeOf<number>();
});
