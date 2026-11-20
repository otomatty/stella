// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { rejectNumbers } from "../src/q07-16-reject-numbers";
test("問16 rejectNumbers", () => {
  expect(rejectNumbers([1, 2, 3], (n) => n === 2)).toEqual([1, 3]);
  expectTypeOf(rejectNumbers).parameters.toEqualTypeOf<
    [readonly number[], (n: number) => boolean]
  >();
  expectTypeOf(rejectNumbers).returns.toEqualTypeOf<number[]>();
});
