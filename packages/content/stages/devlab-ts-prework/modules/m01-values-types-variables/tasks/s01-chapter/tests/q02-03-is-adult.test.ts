// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isAdult } from "../src/q02-03-is-adult";
test("問3 isAdult", () => {
  expect(isAdult(18)).toBe(true);
  expect(isAdult(17)).toBe(false);
  expectTypeOf(isAdult).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(isAdult).returns.toEqualTypeOf<boolean>();
});
