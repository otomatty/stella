import { describe, expect, test } from "vitest";
import {
  canUseMemberDiscount,
  canSendNotice,
  canAcceptRequest,
  checkPickupCode,
  isPickupHour,
  canReserveItem,
} from "../src/conditions.js";

describe("canUseMemberDiscount", () => {
  test("課題文の例", () => {
    expect(canUseMemberDiscount(true, 6000)).toBe(true);
  });

  test.each([
    [[true, 4999], false],
    [[true, 5000], true],
    [[true, 5001], true],
  ])("境界 %j → %j", (args, expected) => {
    expect(canUseMemberDiscount(...args)).toBe(expected);
  });

  test.each([
    [[false, 5000], false],
    [[false, 0], false],
    [[true, 0], false],
  ])("例外的な入力 %j → %j", (args, expected) => {
    expect(canUseMemberDiscount(...args)).toBe(expected);
  });
});

describe("canSendNotice", () => {
  test("課題文の例", () => {
    expect(canSendNotice(false, 21)).toBe(true);
  });

  test.each([
    [[false, 17], false],
    [[false, 18], true],
    [[false, 19], true],
  ])("境界 %j → %j", (args, expected) => {
    expect(canSendNotice(...args)).toBe(expected);
  });

  test.each([
    [[true, 0], true],
    [[false, 0], false],
    [[true, 18], true],
  ])("例外的な入力 %j → %j", (args, expected) => {
    expect(canSendNotice(...args)).toBe(expected);
  });
});

describe("canAcceptRequest", () => {
  test("課題文の例", () => {
    expect(canAcceptRequest(true, 3)).toBe(true);
  });

  test.each([
    [[true, 0], false],
    [[true, 1], true],
    [[true, 2], true],
  ])("境界 %j → %j", (args, expected) => {
    expect(canAcceptRequest(...args)).toBe(expected);
  });

  test.each([
    [[false, 50], false],
    [[false, 0], false],
  ])("例外的な入力 %j → %j", (args, expected) => {
    expect(canAcceptRequest(...args)).toBe(expected);
  });
});

describe("checkPickupCode", () => {
  test("課題文の例", () => {
    expect(checkPickupCode("P12", "P12")).toBe(true);
  });

  test.each([
    [["", "A"], null],
    [["A", "A"], true],
    [["AA", "A"], false],
  ])("境界 %j → %j", (args, expected) => {
    expect(checkPickupCode(...args)).toBe(expected);
  });

  test.each([
    [[" ", "A"], false],
    [["p12", "P12"], false],
  ])("例外的な入力 %j → %j", (args, expected) => {
    expect(checkPickupCode(...args)).toBe(expected);
  });
});

describe("isPickupHour", () => {
  test("課題文の例", () => {
    expect(isPickupHour(12)).toBe(true);
  });

  test.each([
    [[8], false],
    [[9], true],
    [[10], true],
    [[16], true],
    [[17], false],
    [[18], false],
  ])("境界 %j → %j", (args, expected) => {
    expect(isPickupHour(...args)).toBe(expected);
  });

  test.each([
    [[0], false],
    [[23], false],
  ])("例外的な入力 %j → %j", (args, expected) => {
    expect(isPickupHour(...args)).toBe(expected);
  });
});

describe("canReserveItem", () => {
  test("課題文の例", () => {
    expect(canReserveItem(false, 0, true)).toBe(true);
  });

  test.each([
    [[false, 0, false], false],
    [[false, 1, false], true],
    [[false, 2, false], true],
  ])("境界 %j → %j", (args, expected) => {
    expect(canReserveItem(...args)).toBe(expected);
  });

  test.each([
    [[true, 12, true], false],
    [[false, 2, true], true],
  ])("例外的な入力 %j → %j", (args, expected) => {
    expect(canReserveItem(...args)).toBe(expected);
  });
});
