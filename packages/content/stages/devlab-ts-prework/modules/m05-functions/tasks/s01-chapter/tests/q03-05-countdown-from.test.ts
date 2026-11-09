// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { countdownFrom } from "../src/q03-05-countdown-from";
test("問5 countdownFrom", () => {
  expect(countdownFrom(3)).toEqual([3, 2, 1]);
  expect(countdownFrom(5, 3)).toEqual([5, 4, 3]);
  expectTypeOf(countdownFrom).parameters.toEqualTypeOf<[number, number?]>();
  expectTypeOf(countdownFrom).returns.toEqualTypeOf<number[]>();
});
