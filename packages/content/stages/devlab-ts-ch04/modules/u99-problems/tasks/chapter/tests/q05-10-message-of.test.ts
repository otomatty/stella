// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { messageOf } from "../src/q05-10-message-of";
test("問10 messageOf", () => {
  expect(messageOf(new Error("失敗"))).toBe("失敗");
  expect(messageOf("文字列")).toBe("文字列");
  expect(messageOf(404)).toBe("404");
  expectTypeOf(messageOf).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(messageOf).returns.toEqualTypeOf<string>();
});
