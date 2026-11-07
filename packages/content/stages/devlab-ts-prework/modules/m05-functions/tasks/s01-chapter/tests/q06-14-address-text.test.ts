// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { addressText } from "../src/q06-14-address-text";
test("問14 addressText", () => {
  expect(addressText({ pref: "東京都", city: "渋谷区" })).toBe("東京都渋谷区");
  expect(addressText({ pref: "東京都", city: "渋谷区", line: "1-1" })).toBe("東京都渋谷区1-1");
  expectTypeOf(addressText).parameters.toEqualTypeOf<
    [{ pref: string; city: string; line?: string }]
  >();
  expectTypeOf(addressText).returns.toEqualTypeOf<string>();
});
