// このファイルは書き換えないでください
import { expect, test } from "vitest";
import { includesValue } from "../src/q06-14-includes-value";
test("問14 includesValue", () => {
  expect(includesValue([1, 2], 2)).toBe(true);
  expect(includesValue(["a"], "b")).toBe(false);
  const call = () => {
    // @ts-expect-error 数値の配列から文字列は探せない
    includesValue([1, 2], "2");
  };
  expect(typeof call).toBe("function");
});
