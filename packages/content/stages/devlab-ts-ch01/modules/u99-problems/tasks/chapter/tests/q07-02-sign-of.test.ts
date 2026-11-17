// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { signOf } from "../src/q07-02-sign-of";
test("問2 signOf", () => {
  expect(signOf(-5)).toBe(-1);
  expect(signOf(0)).toBe(0);
  expect(signOf(8)).toBe(1);
  expectTypeOf(signOf).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(signOf).returns.toEqualTypeOf<-1 | 0 | 1>();
});
