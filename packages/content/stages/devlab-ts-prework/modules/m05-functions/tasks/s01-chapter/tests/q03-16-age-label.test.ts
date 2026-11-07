// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { ageLabel } from "../src/q03-16-age-label";
test("問16 ageLabel", () => {
  expect(ageLabel(30)).toBe("30歳");
  expect(ageLabel()).toBe("年齢不明");
  expectTypeOf(ageLabel).parameters.toEqualTypeOf<[number?]>();
  expectTypeOf(ageLabel).returns.toEqualTypeOf<string>();
});
