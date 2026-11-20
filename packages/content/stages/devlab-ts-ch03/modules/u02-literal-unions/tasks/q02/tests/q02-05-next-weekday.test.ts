// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { nextWeekday, type Weekday } from "../src/q02-05-next-weekday";
test("問5 nextWeekday", () => {
  expect(nextWeekday("月")).toBe("火");
  expect(nextWeekday("木")).toBe("金");
  expect(nextWeekday("金")).toBe("月");
  expectTypeOf(nextWeekday).parameters.toEqualTypeOf<[Weekday]>();
  expectTypeOf(nextWeekday).returns.toEqualTypeOf<Weekday>();
});
