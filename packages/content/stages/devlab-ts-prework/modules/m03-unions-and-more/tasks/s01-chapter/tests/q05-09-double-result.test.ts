// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { doubleResult, type Result } from "../src/q05-09-double-result";
test("問9 doubleResult", () => {
  expect(doubleResult({ ok: true, value: 4 })).toEqual({ ok: true, value: 8 });
  expect(doubleResult({ ok: false, error: "x" })).toEqual({ ok: false, error: "x" });
  expectTypeOf(doubleResult).parameters.toEqualTypeOf<[Result]>();
  expectTypeOf(doubleResult).returns.toEqualTypeOf<Result>();
});
