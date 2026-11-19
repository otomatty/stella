import { expect, test } from "vitest";
import { canEnterStudio } from "../src/studio.js";

test.each([
  [[true, true, 45], false],
  [[false, true, 44], true],
  [[false, true, 45], true],
  [[false, true, 46], false],
  [[false, false, 45], false],
  [[false, false, 46], false],
])("録音室への入室 %j → %j", (args, expected) => {
  expect(canEnterStudio(...args)).toBe(expected);
});
