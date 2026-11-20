// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { digitCount } from "../src/q04-18-digit-count";
test("問18 digitCount", () => {
  expect(digitCount(12345)).toBe(5);
  expect(digitCount(0)).toBe(1);
  expectTypeOf(digitCount).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(digitCount).returns.toEqualTypeOf<number>();
});
