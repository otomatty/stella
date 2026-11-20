// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { negate } from "../src/q01-09-negate";
test("問9 negate", () => {
  expect(negate(3)).toBe(-3);
  expect(negate(-2)).toBe(2);
  expectTypeOf(negate).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(negate).returns.toEqualTypeOf<number>();
});
