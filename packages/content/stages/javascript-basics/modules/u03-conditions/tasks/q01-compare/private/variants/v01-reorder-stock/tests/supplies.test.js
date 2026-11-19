import { expect, test } from "vitest";
import { shouldReorder } from "../src/supplies.js";

test.each([
  [0, false],
  [19, false],
  [20, true],
  [21, true],
])("使用数 %j → %j", (usedCount, expected) => {
  expect(shouldReorder(usedCount)).toBe(expected);
});
