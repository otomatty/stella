// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { headTail } from "../src/q06-14-head-tail";
test("問14 headTail", () => {
  expect(headTail(["a", "b", "c"])).toEqual(["a", ["b", "c"]]);
  expect(headTail([])).toEqual([undefined, []]);
  expectTypeOf(headTail).parameters.toEqualTypeOf<[readonly string[]]>();
  expectTypeOf(headTail).returns.toEqualTypeOf<[string | undefined, string[]]>();
});
