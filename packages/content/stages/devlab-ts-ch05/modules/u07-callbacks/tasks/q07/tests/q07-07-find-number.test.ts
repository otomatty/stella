// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { findNumber } from "../src/q07-07-find-number";
test("問7 findNumber", () => {
  expect(findNumber([1, 5, 8], (n) => n > 4)).toBe(5);
  expect(findNumber([1], (n) => n > 4)).toBeUndefined();
  expectTypeOf(findNumber).parameters.toEqualTypeOf<[readonly number[], (n: number) => boolean]>();
  expectTypeOf(findNumber).returns.toEqualTypeOf<number | undefined>();
});
