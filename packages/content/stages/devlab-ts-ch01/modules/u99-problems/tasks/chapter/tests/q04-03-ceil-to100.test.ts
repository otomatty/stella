// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { ceilTo100 } from "../src/q04-03-ceil-to100";
test("問3 ceilTo100", () => {
  expect(ceilTo100(101)).toBe(200);
  expect(ceilTo100(100)).toBe(100);
  expectTypeOf(ceilTo100).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(ceilTo100).returns.toEqualTypeOf<number>();
});
