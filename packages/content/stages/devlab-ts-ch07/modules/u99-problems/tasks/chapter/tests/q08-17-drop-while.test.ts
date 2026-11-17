// このファイルは書き換えないでください
import { expect, test } from "vitest";
import { dropWhile } from "../src/q08-17-drop-while";
test("問17 dropWhile", () => {
  expect(dropWhile([1, 2, 5, 1], (n) => n < 3)).toEqual([5, 1]);
  expect(dropWhile(["a"], () => true)).toEqual([]);
});
