// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { safeSqrt, type Result } from "../src/q05-07-safe-sqrt";
test("問7 safeSqrt", () => {
  expect(safeSqrt(9)).toEqual({ ok: true, value: 3 });
  expect(safeSqrt(-1)).toEqual({ ok: false, error: "負の数です" });
  expectTypeOf(safeSqrt).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(safeSqrt).returns.toEqualTypeOf<Result>();
});
