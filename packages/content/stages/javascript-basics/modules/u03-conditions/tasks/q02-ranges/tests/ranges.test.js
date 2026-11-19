import { describe, expect, test } from "vitest";
import {
  scoreGrade,
  shippingFee,
  admissionFee,
  temperatureLabel,
  stockStatus,
  orderDiscount,
} from "../src/ranges.js";

describe("scoreGrade", () => {
  test("課題文の例", () => {
    expect(scoreGrade(85)).toBe("B");
  });

  test.each([
    [[59], "D"],
    [[60], "C"],
    [[61], "C"],
    [[79], "C"],
    [[80], "B"],
    [[81], "B"],
    [[89], "B"],
    [[90], "A"],
    [[91], "A"],
  ])("境界 %j → %j", (args, expected) => {
    expect(scoreGrade(...args)).toBe(expected);
  });

  test.each([
    [[0], "D"],
    [[100], "A"],
  ])("例外的な入力 %j → %j", (args, expected) => {
    expect(scoreGrade(...args)).toBe(expected);
  });
});

describe("shippingFee", () => {
  test("課題文の例", () => {
    expect(shippingFee(4500)).toBe(300);
  });

  test.each([
    [[3999], 600],
    [[4000], 300],
    [[4001], 300],
    [[5999], 300],
    [[6000], 0],
    [[6001], 0],
  ])("境界 %j → %j", (args, expected) => {
    expect(shippingFee(...args)).toBe(expected);
  });

  test.each([
    [[0], 600],
    [[100000], 0],
  ])("例外的な入力 %j → %j", (args, expected) => {
    expect(shippingFee(...args)).toBe(expected);
  });
});

describe("admissionFee", () => {
  test("課題文の例", () => {
    expect(admissionFee(12)).toBe(500);
  });

  test.each([
    [[5], 0],
    [[6], 500],
    [[7], 500],
    [[17], 500],
    [[18], 1000],
    [[19], 1000],
    [[64], 1000],
    [[65], 700],
    [[66], 700],
  ])("境界 %j → %j", (args, expected) => {
    expect(admissionFee(...args)).toBe(expected);
  });

  test.each([
    [[0], 0],
    [[100], 700],
  ])("例外的な入力 %j → %j", (args, expected) => {
    expect(admissionFee(...args)).toBe(expected);
  });
});

describe("temperatureLabel", () => {
  test("課題文の例", () => {
    expect(temperatureLabel(20)).toBe("穏やか");
  });

  test.each([
    [[-1], "氷点下"],
    [[0], "寒い"],
    [[1], "寒い"],
    [[14], "寒い"],
    [[15], "穏やか"],
    [[16], "穏やか"],
    [[24], "穏やか"],
    [[25], "暑い"],
    [[26], "暑い"],
  ])("境界 %j → %j", (args, expected) => {
    expect(temperatureLabel(...args)).toBe(expected);
  });

  test.each([
    [[-30], "氷点下"],
    [[40], "暑い"],
  ])("例外的な入力 %j → %j", (args, expected) => {
    expect(temperatureLabel(...args)).toBe(expected);
  });
});

describe("stockStatus", () => {
  test("課題文の例", () => {
    expect(stockStatus(3)).toBe("残りわずか");
  });

  test.each([
    [[-1], "売り切れ"],
    [[0], "売り切れ"],
    [[1], "残りわずか"],
    [[4], "残りわずか"],
    [[5], "在庫あり"],
    [[6], "在庫あり"],
  ])("境界 %j → %j", (args, expected) => {
    expect(stockStatus(...args)).toBe(expected);
  });

  test.each([
    [[-50], "売り切れ"],
    [[200], "在庫あり"],
  ])("例外的な入力 %j → %j", (args, expected) => {
    expect(stockStatus(...args)).toBe(expected);
  });
});

describe("orderDiscount", () => {
  test("課題文の例", () => {
    expect(orderDiscount(12)).toBe(200);
  });

  test.each([
    [[9], 0],
    [[10], 200],
    [[11], 200],
    [[19], 200],
    [[20], 500],
    [[21], 500],
  ])("境界 %j → %j", (args, expected) => {
    expect(orderDiscount(...args)).toBe(expected);
  });

  test.each([
    [[0], 0],
    [[100], 500],
  ])("例外的な入力 %j → %j", (args, expected) => {
    expect(orderDiscount(...args)).toBe(expected);
  });
});
