// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { resultText, type Result } from "../src/q05-14-result-text";
test("問14 resultText", () => {
  expect(resultText({ ok: true, value: 3 })).toBe("成功: 3");
  expect(resultText({ ok: false, error: "だめ" })).toBe("失敗: だめ");
  expectTypeOf(resultText).parameters.toEqualTypeOf<[Result]>();
  expectTypeOf(resultText).returns.toEqualTypeOf<string>();
});
