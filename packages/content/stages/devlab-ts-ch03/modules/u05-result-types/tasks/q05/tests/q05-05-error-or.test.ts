// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { errorOr, type Result } from "../src/q05-05-error-or";
test("問5 errorOr", () => {
  expect(errorOr({ ok: false, error: "x" }, "なし")).toBe("x");
  expect(errorOr({ ok: true, value: 1 }, "なし")).toBe("なし");
  expectTypeOf(errorOr).parameters.toEqualTypeOf<[Result, string]>();
  expectTypeOf(errorOr).returns.toEqualTypeOf<string>();
});
