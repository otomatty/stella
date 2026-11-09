// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { incrementAt } from "../src/q05-20-increment-at";
test("問20 incrementAt", () => {
  const numbers = [1, 1, 1];
  expect(incrementAt(numbers, 1)).toEqual([1, 2, 1]);
  expect(numbers).toEqual([1, 1, 1]);
  expectTypeOf(incrementAt).parameters.toEqualTypeOf<[readonly number[], number]>();
  expectTypeOf(incrementAt).returns.toEqualTypeOf<number[]>();
});
