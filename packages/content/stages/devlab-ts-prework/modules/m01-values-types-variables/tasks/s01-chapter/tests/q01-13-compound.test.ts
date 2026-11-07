// このファイルは書き換えないでください
import { expect, test } from "vitest";
import { compound } from "../src/q01-13-compound";
test("問13 compound", () => {
  expect(compound(10000, 10, 2)).toBe(12100);
  expect(compound(10000, 5, 3)).toBe(11576);
  expect(compound(10000, 5, 0)).toBe(10000);
});
