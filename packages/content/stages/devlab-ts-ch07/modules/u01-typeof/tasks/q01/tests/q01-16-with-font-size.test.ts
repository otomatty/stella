// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { withFontSize, SETTINGS } from "../src/q01-16-with-font-size";
test("問16 withFontSize", () => {
  expect(withFontSize(SETTINGS, 18)).toEqual({ ...SETTINGS, fontSize: 18 });
  expect(SETTINGS.fontSize).toBe(14);
  expectTypeOf(withFontSize).parameters.toEqualTypeOf<
    [{ theme: string; fontSize: number; notifications: { email: boolean; push: boolean } }, number]
  >();
  expectTypeOf(withFontSize).returns.toEqualTypeOf<{
    theme: string;
    fontSize: number;
    notifications: { email: boolean; push: boolean };
  }>();
});
