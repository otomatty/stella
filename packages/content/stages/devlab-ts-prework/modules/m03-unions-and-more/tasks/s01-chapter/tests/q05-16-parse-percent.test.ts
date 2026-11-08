// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { parsePercent, type Result } from "../src/q05-16-parse-percent";
test("問16 parsePercent", () => {
  expect(parsePercent("50%")).toEqual({ ok: true, value: 50 });
  expect(parsePercent("12.5%")).toEqual({ ok: true, value: 12.5 });
  expect(parsePercent("50")).toEqual({ ok: false, error: "割合ではありません: 50" });
  expect(parsePercent("abc%")).toEqual({ ok: false, error: "割合ではありません: abc%" });
  expect(parsePercent("%")).toEqual({ ok: false, error: "割合ではありません: %" });
  expectTypeOf(parsePercent).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(parsePercent).returns.toEqualTypeOf<Result>();
});
