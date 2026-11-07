// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { scoreTotal } from "../src/q01-16-score-total";
test("問16 scoreTotal", () => {
  expect(scoreTotal({ math: 80, english: 70, science: 90 })).toBe(240);
  expectTypeOf(scoreTotal).parameters.toEqualTypeOf<
    [{ math: number; english: number; science: number }]
  >();
  expectTypeOf(scoreTotal).returns.toEqualTypeOf<number>();
});
