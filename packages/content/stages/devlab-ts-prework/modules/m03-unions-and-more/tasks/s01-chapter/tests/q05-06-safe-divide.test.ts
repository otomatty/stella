// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { safeDivide, type Result } from "../src/q05-06-safe-divide";
test("問6 safeDivide", () => {
  expect(safeDivide(6, 3)).toEqual({ ok: true, value: 2 });
  expect(safeDivide(1, 0)).toEqual({ ok: false, error: "0で割ることはできません" });
  expectTypeOf(safeDivide).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(safeDivide).returns.toEqualTypeOf<Result>();
});
