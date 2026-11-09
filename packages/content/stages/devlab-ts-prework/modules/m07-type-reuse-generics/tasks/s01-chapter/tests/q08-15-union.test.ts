// このファイルは書き換えないでください
import { expect, test } from "vitest";
import { union } from "../src/q08-15-union";
test("問15 union", () => {
  expect(union([1, 2], [2, 3])).toEqual([1, 2, 3]);
  expect(union(["a", "a"], [])).toEqual(["a"]);
});
