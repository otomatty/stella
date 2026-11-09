// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { sumPair } from "../src/q06-18-sum-pair";
test("問18 sumPair", () => {
  expect(sumPair([3, 4])).toBe(7);
  expectTypeOf(sumPair).parameters.toEqualTypeOf<[[number, number]]>();
  expectTypeOf(sumPair).returns.toEqualTypeOf<number>();
});
