// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { noticeText, type Notice } from "../src/q04-09-notice-text";
test("問9 noticeText", () => {
  expect(noticeText({ type: "info", message: "更新しました" })).toBe("[情報] 更新しました");
  expect(noticeText({ type: "warning", message: "容量が少ない", level: 2 })).toBe(
    "[注意Lv2] 容量が少ない",
  );
  expect(noticeText({ type: "error", message: "失敗", code: 500 })).toBe("[エラー500] 失敗");
  expectTypeOf(noticeText).parameters.toEqualTypeOf<[Notice]>();
  expectTypeOf(noticeText).returns.toEqualTypeOf<string>();
});
