// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { parseAge, type Result } from "../src/q05-08-parse-age";
test("問8 parseAge", () => {
  expect(parseAge("30")).toEqual({ ok: true, value: 30 });
  expect(parseAge("abc")).toEqual({ ok: false, error: "年齢ではありません: abc" });
  expect(parseAge("1.5")).toEqual({ ok: false, error: "年齢ではありません: 1.5" });
  expect(parseAge("200")).toEqual({ ok: false, error: "年齢ではありません: 200" });
  expect(parseAge("")).toEqual({ ok: false, error: "年齢ではありません: " });
  expectTypeOf(parseAge).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(parseAge).returns.toEqualTypeOf<Result>();
});
