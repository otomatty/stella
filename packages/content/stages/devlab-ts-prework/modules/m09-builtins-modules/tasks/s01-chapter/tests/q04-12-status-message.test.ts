// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { statusMessage, NotFoundError, HttpError } from "../src/q04-12-status-message";
test("問12 statusMessage", () => {
  expect(statusMessage(new NotFoundError("ユーザー"))).toBe("見つかりません");
  expect(statusMessage(new HttpError(503, "x"))).toBe("通信エラー（503）");
  expect(statusMessage(new Error("その他"))).toBe("その他");
  expect(statusMessage(1)).toBe("不明なエラー");
  expectTypeOf(statusMessage).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(statusMessage).returns.toEqualTypeOf<string>();
});
