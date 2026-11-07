// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { sumValues } from "../src/q08-05-sum-values";
test("問5 sumValues", () => {
  expect(sumValues({ a: 1, b: 2 })).toBe(3);
  expect(sumValues({})).toBe(0);
  expectTypeOf(sumValues).parameters.toEqualTypeOf<[{ [key: string]: number }]>();
  expectTypeOf(sumValues).returns.toEqualTypeOf<number>();
});
