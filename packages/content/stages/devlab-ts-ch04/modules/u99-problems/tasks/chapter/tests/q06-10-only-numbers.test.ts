// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { onlyNumbers } from "../src/q06-10-only-numbers";
test("問10 onlyNumbers", () => {
  expect(onlyNumbers([1, "2", 3])).toEqual([1, 3]);
  expect(onlyNumbers([])).toEqual([]);
  expectTypeOf(onlyNumbers).parameters.toEqualTypeOf<[readonly unknown[]]>();
  expectTypeOf(onlyNumbers).returns.toEqualTypeOf<number[]>();
});
