// このファイルは書き換えないでください
import { expect, test } from "vitest";
import { reverseText } from "../src/q01-10-reverse-text";
test("問10 reverseText", () => {
  expect(reverseText("abc")).toBe("cba");
  expect(reverseText("あいう")).toBe("ういあ");
  expect(reverseText("")).toBe("");
});
