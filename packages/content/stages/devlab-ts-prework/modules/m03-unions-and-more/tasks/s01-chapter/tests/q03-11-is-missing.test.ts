// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isMissing } from "../src/q03-11-is-missing";
test("問11 isMissing", () => {
  expect(isMissing(null)).toBe(true);
  expect(isMissing(undefined)).toBe(true);
  expect(isMissing("")).toBe(false);
  expectTypeOf(isMissing).parameters.toEqualTypeOf<[string | null | undefined]>();
  expectTypeOf(isMissing).returns.toEqualTypeOf<boolean>();
});
