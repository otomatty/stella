// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isTeen } from "../src/q06-04-is-teen";
test("問4 isTeen", () => {
  expect(isTeen(13)).toBe(true);
  expect(isTeen(19)).toBe(true);
  expect(isTeen(20)).toBe(false);
  expect(isTeen(12)).toBe(false);
  expectTypeOf(isTeen).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(isTeen).returns.toEqualTypeOf<boolean>();
});
