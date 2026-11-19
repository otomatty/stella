import { describe, expect, test } from "vitest";
import { ticketPrice } from "../src/cinema.js";

describe("ticketPrice", () => {
  test.each([
    [[11, true, true], 1000],
    [[12, true, true], 1400],
    [[13, true, true], 1400],
    [[63, true, true], 1400],
    [[64, true, true], 1400],
    [[65, true, true], 1200],
    [[66, true, true], 1200],
    [[0, false, false], 1000],
    [[65, true, false], 1200],
    [[80, false, true], 1200],
  ])("年齢別の料金 %j → %j", (args, expected) => {
    expect(ticketPrice(...args)).toBe(expected);
  });

  test.each([
    [[30, true, true], 1400],
    [[30, true, false], 1800],
    [[30, false, true], 1800],
    [[30, false, false], 1800],
  ])("12〜64 歳の曜日と会員区分 %j → %j", (args, expected) => {
    expect(ticketPrice(...args)).toBe(expected);
  });
});
