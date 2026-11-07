// このファイルは書き換えないでください
import { expect, test } from "vitest";
import { gcd } from "../src/q01-18-gcd";
test("問18 gcd", () => {
  expect(gcd(12, 18)).toBe(6);
  expect(gcd(7, 5)).toBe(1);
  expect(gcd(100, 25)).toBe(25);
});
