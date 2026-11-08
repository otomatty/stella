// このファイルは書き換えないでください
import { expect, test } from "vitest";
import { sumBy } from "../src/q07-09-sum-by";
test("問9 sumBy", () => {
  expect(sumBy([{ price: 100 }, { price: 50 }], (x) => x.price)).toBe(150);
  expect(sumBy(["ab", "c"], (s) => s.length)).toBe(3);
});
