// このファイルは書き換えないでください
import { expect, test } from "vitest";
import { power } from "../src/q01-08-power";
test("問8 power", () => {
  expect(power(2, 10)).toBe(1024);
  expect(power(5, 0)).toBe(1);
  expect(power(3, 3)).toBe(27);
});
