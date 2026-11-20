// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { hasDuplicates } from "../src/q02-03-has-duplicates";
test("問3 hasDuplicates", () => {
  expect(hasDuplicates([1, 2, 1])).toBe(true);
  expect(hasDuplicates([1, 2, 3])).toBe(false);
  expectTypeOf(hasDuplicates).parameters.toEqualTypeOf<[number[]]>();
  expectTypeOf(hasDuplicates).returns.toEqualTypeOf<boolean>();
});
