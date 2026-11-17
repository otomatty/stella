// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { double } from "../src/q03-05-double";
test("問5 double", () => {
  expect(double(4)).toBe(8);
  expectTypeOf(double).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(double).returns.toEqualTypeOf<number>();
});
