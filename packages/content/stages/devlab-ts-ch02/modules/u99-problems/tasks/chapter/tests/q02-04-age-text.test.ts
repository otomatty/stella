// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { ageText } from "../src/q02-04-age-text";
test("問4 ageText", () => {
  expect(ageText({ age: 30 })).toBe("30歳");
  expect(ageText({ age: 0 })).toBe("0歳");
  expect(ageText({})).toBe("年齢不明");
  expectTypeOf(ageText).parameters.toEqualTypeOf<[{ age?: number }]>();
  expectTypeOf(ageText).returns.toEqualTypeOf<string>();
});
