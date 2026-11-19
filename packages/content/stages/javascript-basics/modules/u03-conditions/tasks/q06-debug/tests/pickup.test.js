import { describe, expect, test } from "vitest";
import { canCollectOrder, couponPrice, isDefaultLocker } from "../src/pickup.js";

describe("couponPrice", () => {
  test.each([
    [999, 999],
    [1000, 900],
    [1001, 901],
  ])("割引の境界 %j → %j", (total, expected) => {
    expect(couponPrice(total)).toBe(expected);
  });
});

describe("canCollectOrder", () => {
  test.each([
    [[true, true], true],
    [[true, false], false],
    [[false, true], false],
    [[false, false], false],
  ])("支払いと準備の組合せ %j → %j", (args, expected) => {
    expect(canCollectOrder(...args)).toBe(expected);
  });
});

describe("isDefaultLocker", () => {
  test.each([
    [0, true],
    ["0", false],
    [1, false],
    ["", false],
    ["00", false],
  ])("ロッカーの指定 %j → %j", (code, expected) => {
    expect(isDefaultLocker(code)).toBe(expected);
  });
});
