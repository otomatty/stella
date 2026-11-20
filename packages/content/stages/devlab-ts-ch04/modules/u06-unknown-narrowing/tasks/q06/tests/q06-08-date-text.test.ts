// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { dateText } from "../src/q06-08-date-text";
test("問8 dateText", () => {
  expect(dateText(new Date("2026-12-01T09:00:00Z"))).toBe("2026-12-01");
  expect(dateText("2026-12-01")).toBe("日付ではありません");
  expectTypeOf(dateText).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(dateText).returns.toEqualTypeOf<string>();
});
