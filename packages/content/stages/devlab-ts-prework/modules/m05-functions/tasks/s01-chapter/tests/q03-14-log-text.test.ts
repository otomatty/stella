// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { logText } from "../src/q03-14-log-text";
test("問14 logText", () => {
  expect(logText("起動")).toBe("[INFO] 起動");
  expect(logText("起動", "warn")).toBe("[WARN] 起動");
  expectTypeOf(logText).parameters.toEqualTypeOf<[string, ("info" | "warn")?]>();
  expectTypeOf(logText).returns.toEqualTypeOf<string>();
});
