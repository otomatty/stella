// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { widthCss, type Width } from "../src/q01-13-width-css";
test("問13 widthCss", () => {
  expectTypeOf<Width>().toEqualTypeOf<number | "auto">();
  expect(widthCss(100)).toBe("100px");
  expect(widthCss("auto")).toBe("auto");
  expectTypeOf(widthCss).parameters.toEqualTypeOf<[Width]>();
  expectTypeOf(widthCss).returns.toEqualTypeOf<string>();
});
