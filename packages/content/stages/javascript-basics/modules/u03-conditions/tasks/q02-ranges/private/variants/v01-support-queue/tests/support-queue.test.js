import { expect, test } from "vitest";
import { queuePriority } from "../src/support-queue.js";

test.each([
  [0, "normal"],
  [4, "normal"],
  [5, "soon"],
  [6, "soon"],
  [14, "soon"],
  [15, "urgent"],
  [16, "urgent"],
])("未対応件数 %j → %j", (pendingCount, expected) => {
  expect(queuePriority(pendingCount)).toBe(expected);
});
