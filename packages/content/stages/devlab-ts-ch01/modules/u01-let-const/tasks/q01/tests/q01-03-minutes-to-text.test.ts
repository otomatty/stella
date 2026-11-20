// このファイルは書き換えないでください
import { expect, test } from "vitest";
import { minutesToText } from "../src/q01-03-minutes-to-text";
test("問3 minutesToText", () => {
  expect(minutesToText(125)).toBe("2時間5分");
  expect(minutesToText(60)).toBe("1時間0分");
  expect(minutesToText(45)).toBe("0時間45分");
});
