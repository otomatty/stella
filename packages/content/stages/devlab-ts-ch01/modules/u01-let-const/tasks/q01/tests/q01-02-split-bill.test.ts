// このファイルは書き換えないでください
import { expect, test } from "vitest";
import { splitBill } from "../src/q01-02-split-bill";
test("問2 splitBill", () => {
  expect(splitBill(10000, 3)).toBe(3400);
  expect(splitBill(9000, 3)).toBe(3000);
  expect(splitBill(1000, 4)).toBe(300);
});
