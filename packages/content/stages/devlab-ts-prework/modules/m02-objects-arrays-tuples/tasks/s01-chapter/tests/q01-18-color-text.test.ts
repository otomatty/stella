// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { colorText } from "../src/q01-18-color-text";
test("問18 colorText", () => {
  expect(colorText({ r: 255, g: 0, b: 0 })).toBe("rgb(255, 0, 0)");
  expectTypeOf(colorText).parameters.toEqualTypeOf<[{ r: number; g: number; b: number }]>();
  expectTypeOf(colorText).returns.toEqualTypeOf<string>();
});
