// このファイルは書き換えないでください
import { expect, test } from "vitest";
import { countWhere } from "../src/q07-15-count-where";
test("問15 countWhere", () => {
  expect(countWhere([1, 2, 3], (n) => n > 1)).toBe(2);
  expect(countWhere(["a", "bb"], (s) => s.length === 2)).toBe(1);
});
