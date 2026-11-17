// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { half } from "../src/q02-14-half";
test("問14 half", () => {
  expect(half(7)).toBe(3.5);
  expect(half(-4)).toBe(-2);
  expectTypeOf(half).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(half).returns.toEqualTypeOf<number>();
});
