// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { maxOf2 } from "../src/q01-02-max-of2";
test("問2 maxOf2", () => {
  expect(maxOf2(3, 8)).toBe(8);
  expect(maxOf2(9, 2)).toBe(9);
  expectTypeOf(maxOf2).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(maxOf2).returns.toEqualTypeOf<number>();
});
