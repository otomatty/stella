import { describe, expect, test } from "vitest";
import { orderTotal } from "../src/order.js";

describe("orderTotal", () => {
  test("課題文の例", () => {
    expect(orderTotal(1500, 2, true)).toBe(3570);
  });

  test.each([
    [[2727, 1, false], 3599],
    [[2728, 1, false], 3000],
    [[2729, 1, false], 3001],
  ])("送料無料の境界 %j → %j", (args, expected) => {
    expect(orderTotal(...args)).toBe(expected);
  });

  test.each([
    [[2999, 1, true], 3298],
    [[3000, 1, true], 3570],
    [[3001, 1, true], 3571],
  ])("会員割引の境界 %j → %j", (args, expected) => {
    expect(orderTotal(...args)).toBe(expected);
  });

  test("非会員には小計が 3,000 円でも割引を適用しない", () => {
    expect(orderTotal(1500, 2, false)).toBe(3300);
  });

  test.each([
    [[5000, 0, true], 0],
    [[0, 1, false], 600],
    [[1200, 3, true], 3630],
  ])("例外的な入力 %j → %j", (args, expected) => {
    expect(orderTotal(...args)).toBe(expected);
  });
});
