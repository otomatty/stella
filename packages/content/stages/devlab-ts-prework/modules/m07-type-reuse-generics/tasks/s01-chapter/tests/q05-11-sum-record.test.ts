// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { sumRecord } from "../src/q05-11-sum-record";
test("問11 sumRecord", () => {
  expect(sumRecord({ a: 1, b: 2 })).toBe(3);
  expect(sumRecord({})).toBe(0);
  expectTypeOf(sumRecord).parameters.toEqualTypeOf<[Record<string, number>]>();
  expectTypeOf(sumRecord).returns.toEqualTypeOf<number>();
});
