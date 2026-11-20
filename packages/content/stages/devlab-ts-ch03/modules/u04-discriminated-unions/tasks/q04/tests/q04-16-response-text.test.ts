// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { responseText, type ApiResponse } from "../src/q04-16-response-text";
test("問16 responseText", () => {
  expectTypeOf<ApiResponse>().toEqualTypeOf<
    { ok: true; data: string } | { ok: false; status: number }
  >();
  expect(responseText({ ok: true, data: "こんにちは" })).toBe("こんにちは");
  expect(responseText({ ok: false, status: 404 })).toBe("エラー 404");
  expectTypeOf(responseText).parameters.toEqualTypeOf<[ApiResponse]>();
  expectTypeOf(responseText).returns.toEqualTypeOf<string>();
});
