// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { dateText } from "../src/q04-14-date-text";
test("問14 dateText", () => {
  expect(dateText(2026)).toBe("2026-01-01");
  expect(dateText(2026, 12, 4)).toBe("2026-12-04");
  expectTypeOf(dateText).parameters.toEqualTypeOf<[number, number?, number?]>();
  expectTypeOf(dateText).returns.toEqualTypeOf<string>();
});
