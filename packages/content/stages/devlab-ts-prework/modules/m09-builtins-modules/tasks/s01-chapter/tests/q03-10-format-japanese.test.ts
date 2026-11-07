// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { formatJapanese } from "../src/q03-10-format-japanese";
test("問10 formatJapanese", () => {
  expect(formatJapanese(new Date(2026, 3, 1))).toBe("2026年4月1日（水）");
  expect(formatJapanese(new Date(2026, 11, 25))).toBe("2026年12月25日（金）");
  expectTypeOf(formatJapanese).parameters.toEqualTypeOf<[Date]>();
  expectTypeOf(formatJapanese).returns.toEqualTypeOf<string>();
});
