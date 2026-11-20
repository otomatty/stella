// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { digitsOf } from "../src/q04-20-digits-of";
test("問20 digitsOf", () => {
  expect(digitsOf(305)).toEqual([3, 0, 5]);
  expect(digitsOf(0)).toEqual([0]);
  expectTypeOf(digitsOf).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(digitsOf).returns.toEqualTypeOf<number[]>();
});
