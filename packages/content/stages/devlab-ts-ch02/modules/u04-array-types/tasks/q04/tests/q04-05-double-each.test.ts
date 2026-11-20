// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { doubleEach } from "../src/q04-05-double-each";
test("問5 doubleEach", () => {
  expect(doubleEach([1, 2, 3])).toEqual([2, 4, 6]);
  expectTypeOf(doubleEach).parameters.toEqualTypeOf<[readonly number[]]>();
  expectTypeOf(doubleEach).returns.toEqualTypeOf<number[]>();
});
