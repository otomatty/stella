// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { tempText, type Temperature } from "../src/q01-20-temp-text";
test("問20 tempText", () => {
  expectTypeOf<Temperature>().toEqualTypeOf<number | "不明">();
  expect(tempText(25)).toBe("25℃");
  expect(tempText("不明")).toBe("不明");
  expectTypeOf(tempText).parameters.toEqualTypeOf<[Temperature]>();
  expectTypeOf(tempText).returns.toEqualTypeOf<string>();
});
