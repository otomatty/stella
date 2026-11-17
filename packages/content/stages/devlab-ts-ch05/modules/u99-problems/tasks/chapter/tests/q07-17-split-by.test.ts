// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { splitBy } from "../src/q07-17-split-by";
test("問17 splitBy", () => {
  expect(splitBy([1, 2, 3], (n) => n > 1)).toEqual([[2, 3], [1]]);
  expectTypeOf(splitBy).parameters.toEqualTypeOf<[readonly number[], (n: number) => boolean]>();
  expectTypeOf(splitBy).returns.toEqualTypeOf<[number[], number[]]>();
});
