// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { settingText } from "../src/q02-20-setting-text";
test("問20 settingText", () => {
  expect(settingText({ darkMode: true })).toBe("ダーク / 16px");
  expect(settingText({ darkMode: false, fontSize: 20 })).toBe("ライト / 20px");
  expectTypeOf(settingText).parameters.toEqualTypeOf<
    [{ readonly darkMode: boolean; fontSize?: number }]
  >();
  expectTypeOf(settingText).returns.toEqualTypeOf<string>();
});
