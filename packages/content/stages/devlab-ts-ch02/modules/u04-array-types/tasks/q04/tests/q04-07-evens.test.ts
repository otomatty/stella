// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { evens } from "../src/q04-07-evens";
test("問7 evens", () => {
  expect(evens([1, 2, 3, 4])).toEqual([2, 4]);
  expectTypeOf(evens).parameters.toEqualTypeOf<[readonly number[]]>();
  expectTypeOf(evens).returns.toEqualTypeOf<number[]>();
});
