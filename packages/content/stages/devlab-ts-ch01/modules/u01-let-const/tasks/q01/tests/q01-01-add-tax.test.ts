// このファイルは書き換えないでください
import { expect, test } from "vitest";
import { addTax } from "../src/q01-01-add-tax";
test("問1 addTax", () => {
  expect(addTax(1000)).toBe(1100);
  expect(addTax(980)).toBe(1078);
  expect(addTax(5)).toBe(5);
});
