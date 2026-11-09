// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { fontPx, type FontSize } from "../src/q01-19-font-px";
test("問19 fontPx", () => {
  expectTypeOf<FontSize>().toEqualTypeOf<number | "S" | "M" | "L">();
  expect(fontPx("S")).toBe(12);
  expect(fontPx("M")).toBe(16);
  expect(fontPx("L")).toBe(20);
  expect(fontPx(18)).toBe(18);
  expectTypeOf(fontPx).parameters.toEqualTypeOf<[FontSize]>();
  expectTypeOf(fontPx).returns.toEqualTypeOf<number>();
});
