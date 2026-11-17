// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { checkAge } from "../src/q05-14-check-age";
test("問14 checkAge", () => {
  expect(() => {
    checkAge(200);
  }).toThrow(RangeError);
  expect(() => {
    checkAge(-1);
  }).toThrow(RangeError);
  expect(() => {
    checkAge(30);
  }).not.toThrow();
  expectTypeOf(checkAge).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(checkAge).returns.toBeVoid();
});
