// このファイルは書き換えないでください
import { expect, test } from "vitest";
import { digitSum } from "../src/q01-11-digit-sum";
test("問11 digitSum", () => {
  expect(digitSum(1234)).toBe(10);
  expect(digitSum(9)).toBe(9);
  expect(digitSum(0)).toBe(0);
});
