// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { parseWeekday, type Weekday } from "../src/q02-06-parse-weekday";
test("問6 parseWeekday", () => {
  expect(parseWeekday("水曜日")).toBe("水");
  expect(parseWeekday("金")).toBe("金");
  expect(parseWeekday("土曜日")).toBeUndefined();
  expectTypeOf(parseWeekday).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(parseWeekday).returns.toEqualTypeOf<Weekday | undefined>();
});
