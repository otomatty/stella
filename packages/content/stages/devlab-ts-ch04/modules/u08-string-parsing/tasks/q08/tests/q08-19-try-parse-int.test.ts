// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { tryParseInt } from "../src/q08-19-try-parse-int";
test("問19 tryParseInt", () => {
  expect(tryParseInt("12")).toEqual({ ok: true, value: 12 });
  expect(tryParseInt("1.5")).toEqual({ ok: false, error: "整数ではありません: 1.5" });
  expectTypeOf(tryParseInt).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(tryParseInt).returns.toEqualTypeOf<
    { ok: true; value: number } | { ok: false; error: string }
  >();
});
