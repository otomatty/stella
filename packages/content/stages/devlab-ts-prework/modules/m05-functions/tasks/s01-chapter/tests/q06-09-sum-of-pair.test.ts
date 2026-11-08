// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { sumOfPair } from "../src/q06-09-sum-of-pair";
test("問9 sumOfPair", () => {
  expect(sumOfPair({ a: 2, b: 5 })).toBe(7);
  expectTypeOf(sumOfPair).parameters.toEqualTypeOf<[{ a: number; b: number }]>();
  expectTypeOf(sumOfPair).returns.toEqualTypeOf<number>();
});
