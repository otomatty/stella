// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { settingValue } from "../src/q02-09-setting-value";
test("問9 settingValue", () => {
  expect(settingValue("fontSize")).toBe(14);
  expect(settingValue("beta")).toBe(false);
  expectTypeOf(settingValue).parameters.toEqualTypeOf<["theme" | "fontSize" | "beta"]>();
  expectTypeOf(settingValue).returns.toEqualTypeOf<string | number | boolean>();
});
