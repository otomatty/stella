// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { headAndTail } from "../src/q06-16-head-and-tail";
test("問16 headAndTail", () => {
  expect(headAndTail([1, 2, 3])).toEqual({ head: 1, tail: [2, 3] });
  expect(headAndTail([])).toEqual({ head: undefined, tail: [] });
  expectTypeOf(headAndTail).parameters.toEqualTypeOf<[readonly number[]]>();
  expectTypeOf(headAndTail).returns.toEqualTypeOf<{ head: number | undefined; tail: number[] }>();
});
