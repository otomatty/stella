// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { valueOr, type Result } from "../src/q05-04-value-or";
test("問4 valueOr", () => {
  expect(valueOr({ ok: true, value: 5 }, 0)).toBe(5);
  expect(valueOr({ ok: false, error: "x" }, 0)).toBe(0);
  expectTypeOf(valueOr).parameters.toEqualTypeOf<[Result, number]>();
  expectTypeOf(valueOr).returns.toEqualTypeOf<number>();
});
