import { describe, expect, test } from "vitest";
import { loanLateFee } from "../src/library.js";

describe("loanLateFee", () => {
  test.each([
    [[true, 1, 0], null],
    [[true, 1, 4], null],
    [[false, 5, 0], null],
    [[false, 5, 4], null],
    [[false, 6, 4], null],
    [[true, 5, 4], null],
  ])("貸出不可 %j → %j", (args, expected) => {
    expect(loanLateFee(...args)).toBe(expected);
  });

  test.each([
    [[false, 0, 0], 0],
    [[false, 4, 1], 0],
    [[false, 4, 2], 0],
    [[false, 4, 3], 50],
    [[false, 4, 4], 100],
  ])("貸出可能な場合の延滞料 %j → %j", (args, expected) => {
    expect(loanLateFee(...args)).toBe(expected);
  });
});
