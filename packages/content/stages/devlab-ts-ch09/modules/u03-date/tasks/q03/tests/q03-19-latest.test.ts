// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { latest } from "../src/q03-19-latest";
test("問19 latest", () => {
  const dates = [new Date(2026, 3, 1), new Date(2026, 3, 3), new Date(2026, 3, 2)];
  expect(latest(dates)).toBe(dates[1]);
  expect(latest([])).toBeUndefined();
  expectTypeOf(latest).parameters.toEqualTypeOf<[Date[]]>();
  expectTypeOf(latest).returns.toEqualTypeOf<Date | undefined>();
});
