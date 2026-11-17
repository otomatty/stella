// このファイルは書き換えないでください
import { expect, test } from "vitest";
import { fibonacci } from "../src/q01-19-fibonacci";
test("問19 fibonacci", () => {
  expect(fibonacci(10)).toBe(55);
  expect(fibonacci(0)).toBe(0);
  expect(fibonacci(1)).toBe(1);
  expect(fibonacci(2)).toBe(1);
});
