import { describe, expect, test } from "vitest";
import {
  isFreeShipping,
  isAdult,
  isPerfectScore,
  hasStock,
  matchesProductCode,
  isPastDeadline,
  isOverCapacity,
  isEmptyText,
} from "../src/checks.js";

describe("isFreeShipping", () => {
  test("課題文の例", () => {
    expect(isFreeShipping(4500)).toBe(true);
  });

  test.each([
    [[2999], false],
    [[3000], true],
    [[3001], true],
  ])("境界 %j → %j", (args, expected) => {
    expect(isFreeShipping(...args)).toBe(expected);
  });

  test.each([[[0], false]])("例外的な入力 %j → %j", (args, expected) => {
    expect(isFreeShipping(...args)).toBe(expected);
  });
});

describe("isAdult", () => {
  test("課題文の例", () => {
    expect(isAdult(30)).toBe(true);
  });

  test.each([
    [[17], false],
    [[18], true],
    [[19], true],
  ])("境界 %j → %j", (args, expected) => {
    expect(isAdult(...args)).toBe(expected);
  });

  test.each([[[0], false]])("例外的な入力 %j → %j", (args, expected) => {
    expect(isAdult(...args)).toBe(expected);
  });
});

describe("isPerfectScore", () => {
  test("課題文の例", () => {
    expect(isPerfectScore(80)).toBe(false);
  });

  test.each([
    [[99], false],
    [[100], true],
    [[101], false],
  ])("境界 %j → %j", (args, expected) => {
    expect(isPerfectScore(...args)).toBe(expected);
  });

  test.each([[[0], false]])("例外的な入力 %j → %j", (args, expected) => {
    expect(isPerfectScore(...args)).toBe(expected);
  });
});

describe("hasStock", () => {
  test("課題文の例", () => {
    expect(hasStock(2)).toBe(true);
  });

  test.each([
    [[-1], false],
    [[0], false],
    [[1], true],
  ])("境界 %j → %j", (args, expected) => {
    expect(hasStock(...args)).toBe(expected);
  });

  test.each([[[-20], false]])("例外的な入力 %j → %j", (args, expected) => {
    expect(hasStock(...args)).toBe(expected);
  });
});

describe("matchesProductCode", () => {
  test("課題文の例", () => {
    expect(matchesProductCode("P12", "P12")).toBe(true);
  });

  test.each([
    [["P11", "P12"], false],
    [["P12", "P12"], true],
    [["P13", "P12"], false],
  ])("境界 %j → %j", (args, expected) => {
    expect(matchesProductCode(...args)).toBe(expected);
  });

  test.each([
    [[12, "12"], false],
    [["p12", "P12"], false],
    [["", "P12"], false],
  ])("例外的な入力 %j → %j", (args, expected) => {
    expect(matchesProductCode(...args)).toBe(expected);
  });
});

describe("isPastDeadline", () => {
  test("課題文の例", () => {
    expect(isPastDeadline(720, 700)).toBe(true);
  });

  test.each([
    [[699, 700], false],
    [[700, 700], false],
    [[701, 700], true],
  ])("境界 %j → %j", (args, expected) => {
    expect(isPastDeadline(...args)).toBe(expected);
  });

  test.each([
    [[0, 0], false],
    [[1439, 0], true],
  ])("例外的な入力 %j → %j", (args, expected) => {
    expect(isPastDeadline(...args)).toBe(expected);
  });
});

describe("isOverCapacity", () => {
  test("課題文の例", () => {
    expect(isOverCapacity(25, 20)).toBe(true);
  });

  test.each([
    [[19, 20], false],
    [[20, 20], false],
    [[21, 20], true],
  ])("境界 %j → %j", (args, expected) => {
    expect(isOverCapacity(...args)).toBe(expected);
  });

  test.each([
    [[0, 0], false],
    [[1, 0], true],
  ])("例外的な入力 %j → %j", (args, expected) => {
    expect(isOverCapacity(...args)).toBe(expected);
  });
});

describe("isEmptyText", () => {
  test("課題文の例", () => {
    expect(isEmptyText("STELLA")).toBe(false);
  });

  test.each([
    [[""], true],
    [["a"], false],
    [["ab"], false],
  ])("境界 %j → %j", (args, expected) => {
    expect(isEmptyText(...args)).toBe(expected);
  });

  test.each([
    [[" "], false],
    [["\n"], false],
  ])("例外的な入力 %j → %j", (args, expected) => {
    expect(isEmptyText(...args)).toBe(expected);
  });
});
