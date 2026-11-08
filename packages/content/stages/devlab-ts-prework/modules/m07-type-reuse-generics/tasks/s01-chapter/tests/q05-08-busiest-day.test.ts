// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { busiestDay, type Weekday } from "../src/q05-08-busiest-day";
test("問8 busiestDay", () => {
  expect(busiestDay({ mon: ["a"], tue: [], wed: ["b", "c"], thu: [], fri: ["d", "e"] })).toBe(
    "wed",
  );
  expect(busiestDay({ mon: [], tue: [], wed: [], thu: [], fri: [] })).toBe("mon");
  expectTypeOf(busiestDay).parameters.toEqualTypeOf<[Record<Weekday, string[]>]>();
  expectTypeOf(busiestDay).returns.toEqualTypeOf<Weekday>();
});
