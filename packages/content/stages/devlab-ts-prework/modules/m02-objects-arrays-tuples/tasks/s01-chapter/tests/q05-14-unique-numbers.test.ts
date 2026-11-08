// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { uniqueNumbers } from "../src/q05-14-unique-numbers";
test("問14 uniqueNumbers", () => {
  expect(uniqueNumbers([3, 1, 3, 2, 1])).toEqual([3, 1, 2]);
  expect(uniqueNumbers([])).toEqual([]);
  expectTypeOf(uniqueNumbers).parameters.toEqualTypeOf<[readonly number[]]>();
  expectTypeOf(uniqueNumbers).returns.toEqualTypeOf<number[]>();
});
