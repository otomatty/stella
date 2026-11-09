// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { makeScore } from "../src/q01-17-make-score";
test("問17 makeScore", () => {
  expect(makeScore(80, 70, 90)).toEqual({ math: 80, english: 70, science: 90 });
  expectTypeOf(makeScore).parameters.toEqualTypeOf<[number, number, number]>();
  expectTypeOf(makeScore).returns.toEqualTypeOf<{
    math: number;
    english: number;
    science: number;
  }>();
});
