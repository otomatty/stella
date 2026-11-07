// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { minutesToSeconds } from "../src/q04-15-minutes-to-seconds";
test("問15 minutesToSeconds", () => {
  expect(minutesToSeconds(1.5)).toBe(90);
  expect(minutesToSeconds(0)).toBe(0);
  expectTypeOf(minutesToSeconds).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(minutesToSeconds).returns.toEqualTypeOf<number>();
});
