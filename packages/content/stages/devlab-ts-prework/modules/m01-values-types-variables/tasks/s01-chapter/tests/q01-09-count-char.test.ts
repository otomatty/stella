// このファイルは書き換えないでください
import { expect, test } from "vitest";
import { countChar } from "../src/q01-09-count-char";
test("問9 countChar", () => {
  expect(countChar("banana", "a")).toBe(3);
  expect(countChar("banana", "z")).toBe(0);
  expect(countChar("", "a")).toBe(0);
});
