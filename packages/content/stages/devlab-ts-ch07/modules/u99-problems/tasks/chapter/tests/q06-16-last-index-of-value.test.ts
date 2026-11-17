// このファイルは書き換えないでください
import { expect, test } from "vitest";
import { lastIndexOfValue } from "../src/q06-16-last-index-of-value";
test("問16 lastIndexOfValue", () => {
  expect(lastIndexOfValue(["a", "b", "a"], "a")).toBe(2);
  expect(lastIndexOfValue([1], 2)).toBe(-1);
  const call = () => {
    // @ts-expect-error 文字列の配列から数値は探せない
    lastIndexOfValue(["a"], 1);
  };
  expect(typeof call).toBe("function");
});
