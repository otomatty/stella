// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { romanDigit } from "../src/q02-08-roman-digit";
test("問8 romanDigit", () => {
  expect(romanDigit(1)).toBe("I");
  expect(romanDigit(4)).toBe("IV");
  expect(romanDigit(5)).toBe("V");
  expect(romanDigit(6)).toBe("");
  expectTypeOf(romanDigit).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(romanDigit).returns.toEqualTypeOf<string>();
});
