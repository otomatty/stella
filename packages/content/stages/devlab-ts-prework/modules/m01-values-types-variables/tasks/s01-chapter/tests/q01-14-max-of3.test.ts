// このファイルは書き換えないでください
import { expect, test } from "vitest";
import { maxOf3 } from "../src/q01-14-max-of3";
test("問14 maxOf3", () => {
  expect(maxOf3(3, 9, 2)).toBe(9);
  expect(maxOf3(7, 1, 5)).toBe(7);
  expect(maxOf3(-3, -2, -1)).toBe(-1);
});
