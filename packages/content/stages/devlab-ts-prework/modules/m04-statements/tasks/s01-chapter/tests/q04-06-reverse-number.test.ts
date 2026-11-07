// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { reverseNumber } from "../src/q04-06-reverse-number";
test("問6 reverseNumber", () => {
  expect(reverseNumber(123)).toBe(321);
  expect(reverseNumber(1230)).toBe(321);
  expect(reverseNumber(0)).toBe(0);
  expectTypeOf(reverseNumber).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(reverseNumber).returns.toEqualTypeOf<number>();
});
