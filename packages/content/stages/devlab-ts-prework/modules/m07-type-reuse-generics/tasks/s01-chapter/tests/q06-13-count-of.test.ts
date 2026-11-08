// このファイルは書き換えないでください
import { expect, test } from "vitest";
import { countOf } from "../src/q06-13-count-of";
test("問13 countOf", () => {
  const words: string[] = ["a", "b", "a"];
  expect(countOf(words, "a")).toBe(2);
  expect(countOf([1, 2, 1], 1)).toBe(2);
  const call = () => {
    // @ts-expect-error 文字列の配列に数値は探せない
    countOf(words, 1);
  };
  expect(typeof call).toBe("function");
});
