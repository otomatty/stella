// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { secondsToMinutes } from "../src/q02-17-seconds-to-minutes";
test("問17 secondsToMinutes", () => {
  expect(secondsToMinutes(150)).toBe(2);
  expect(secondsToMinutes(59)).toBe(0);
  expectTypeOf(secondsToMinutes).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(secondsToMinutes).returns.toEqualTypeOf<number>();
});
