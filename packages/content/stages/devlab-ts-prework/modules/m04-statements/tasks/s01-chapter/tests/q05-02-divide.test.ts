// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { divide } from "../src/q05-02-divide";
test("問2 divide", () => {
  expect(divide(6, 3)).toBe(2);
  expect(() => divide(1, 0)).toThrow("0で割ることはできません");
  expectTypeOf(divide).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(divide).returns.toEqualTypeOf<number>();
});
