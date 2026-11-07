// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { STATUS_TEXT, statusText, type Status } from "../src/q07-16-status-text";
test("問16 statusText", () => {
  expect(STATUS_TEXT).toEqual({ todo: "未着手", doing: "作業中", done: "完了" });
  expect(statusText("doing")).toBe("作業中");
  expectTypeOf(statusText).parameters.toEqualTypeOf<[Status]>();
  expectTypeOf(statusText).returns.toEqualTypeOf<"未着手" | "作業中" | "完了">();
});
