// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isAdult } from "../src/q08-04-is-adult";
test("問4 isAdult", () => {
  expect(isAdult(20)).toBe(true);
  expect(isAdult(19)).toBe(false);
  expectTypeOf(isAdult).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(isAdult).returns.toEqualTypeOf<boolean>();
});
