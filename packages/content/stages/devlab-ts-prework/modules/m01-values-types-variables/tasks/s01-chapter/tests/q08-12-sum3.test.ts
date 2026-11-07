// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { sum3 } from "../src/q08-12-sum3";
test("問12 sum3", () => {
  expect(sum3(1, 2, 3)).toBe(6);
  expectTypeOf(sum3).parameters.toEqualTypeOf<[number, number, number]>();
  expectTypeOf(sum3).returns.toEqualTypeOf<number>();
});
