// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { makeValidator } from "../src/q08-17-make-validator";
test("問17 makeValidator", () => {
  const isValid = makeValidator(1, 10);
  expect(isValid(5)).toBe(true);
  expect(isValid(11)).toBe(false);
  expectTypeOf(makeValidator).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(makeValidator).returns.toEqualTypeOf<(n: number) => boolean>();
});
