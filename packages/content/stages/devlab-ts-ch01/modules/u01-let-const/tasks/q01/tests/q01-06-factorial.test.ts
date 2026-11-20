// このファイルは書き換えないでください
import { expect, test } from "vitest";
import { factorial } from "../src/q01-06-factorial";
test("問6 factorial", () => {
  expect(factorial(5)).toBe(120);
  expect(factorial(1)).toBe(1);
  expect(factorial(0)).toBe(1);
});
