// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { parseClock } from "../src/q08-04-parse-clock";
test("問4 parseClock", () => {
  expect(parseClock("09:30")).toBe(570);
  expect(parseClock("0:00")).toBe(0);
  expect(() => parseClock("24:00")).toThrow("時刻ではありません: 24:00");
  expect(() => parseClock("12")).toThrow("時刻ではありません: 12");
  expectTypeOf(parseClock).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(parseClock).returns.toEqualTypeOf<number>();
});
