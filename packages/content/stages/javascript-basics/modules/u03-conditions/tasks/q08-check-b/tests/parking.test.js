import { describe, expect, test } from "vitest";
import { parkingRate } from "../src/parking.js";

describe("parkingRate", () => {
  test.each([
    [[20, true, false], "lost-ticket"],
    [[60, false, false], "lost-ticket"],
    [[180, false, false], "lost-ticket"],
  ])("駐車券を紛失した場合 %j → %j", (args, expected) => {
    expect(parkingRate(...args)).toBe(expected);
  });

  test.each([
    [[0, true, true], "free"],
    [[29, true, true], "free"],
    [[30, true, true], "free"],
    [[31, true, true], "standard"],
    [[30, false, true], "standard"],
    [[179, false, true], "standard"],
    [[180, false, true], "daily"],
    [[181, true, true], "daily"],
  ])("駐車券がある場合 %j → %j", (args, expected) => {
    expect(parkingRate(...args)).toBe(expected);
  });
});
