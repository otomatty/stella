// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isNum } from "../src/q09-02-is-num";
test("問2 isNum", () => {
  expect(isNum(1)).toBe(true);
  expect(isNum(NaN)).toBe(false);
  expect(isNum("1")).toBe(false);
  expectTypeOf(isNum).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(isNum).guards.toEqualTypeOf<number>();
});
