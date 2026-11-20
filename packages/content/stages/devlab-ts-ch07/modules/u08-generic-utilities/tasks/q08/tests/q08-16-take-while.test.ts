// このファイルは書き換えないでください
import { expect, test } from "vitest";
import { takeWhile } from "../src/q08-16-take-while";
test("問16 takeWhile", () => {
  expect(takeWhile([1, 2, 5, 1], (n) => n < 3)).toEqual([1, 2]);
  expect(takeWhile(["a"], () => false)).toEqual([]);
});
