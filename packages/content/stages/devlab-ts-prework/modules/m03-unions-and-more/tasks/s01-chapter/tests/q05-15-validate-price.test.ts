// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { validatePrice, type Result } from "../src/q05-15-validate-price";
test("問15 validatePrice", () => {
  expect(validatePrice(100)).toEqual({ ok: true, value: 100 });
  expect(validatePrice(-1)).toEqual({ ok: false, error: "価格は0以上にしてください" });
  expect(validatePrice(1.5)).toEqual({ ok: false, error: "価格は整数にしてください" });
  expectTypeOf(validatePrice).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(validatePrice).returns.toEqualTypeOf<Result>();
});
