// このファイルは書き換えないでください
import { expect, test } from "vitest";
import { sumTo } from "../src/q01-05-sum-to";
test("問5 sumTo", () => {
  expect(sumTo(10)).toBe(55);
  expect(sumTo(1)).toBe(1);
  expect(sumTo(0)).toBe(0);
});
