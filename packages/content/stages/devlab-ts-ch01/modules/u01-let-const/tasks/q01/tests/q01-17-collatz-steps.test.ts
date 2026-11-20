// このファイルは書き換えないでください
import { expect, test } from "vitest";
import { collatzSteps } from "../src/q01-17-collatz-steps";
test("問17 collatzSteps", () => {
  expect(collatzSteps(6)).toBe(8);
  expect(collatzSteps(1)).toBe(0);
  expect(collatzSteps(7)).toBe(16);
});
