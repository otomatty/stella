// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { rgbText } from "../src/q06-10-rgb-text";
test("問10 rgbText", () => {
  expect(rgbText([255, 0, 0])).toBe("rgb(255, 0, 0)");
  expectTypeOf(rgbText).parameters.toEqualTypeOf<[[number, number, number]]>();
  expectTypeOf(rgbText).returns.toEqualTypeOf<string>();
});
