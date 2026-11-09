// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { loadSettings } from "../src/q05-18-load-settings";
test("問18 loadSettings", () => {
  expect(loadSettings('{"a":1}')).toEqual({ a: 1 });
  expect(() => loadSettings("{")).toThrow("設定を読めません");
  try {
    loadSettings("{");
  } catch (error) {
    expect(error instanceof Error && error.cause instanceof SyntaxError).toBe(true);
  }
  expectTypeOf(loadSettings).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(loadSettings).returns.toEqualTypeOf<unknown>();
});
