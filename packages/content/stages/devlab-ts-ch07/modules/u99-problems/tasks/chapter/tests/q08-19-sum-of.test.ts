// このファイルは書き換えないでください
import { expect, test } from "vitest";
import { sumOf } from "../src/q08-19-sum-of";
test("問19 sumOf", () => {
  expect(sumOf([{ p: 100 }, { p: 50 }], (x) => x.p)).toBe(150);
  expect(sumOf([], () => 1)).toBe(0);
});
