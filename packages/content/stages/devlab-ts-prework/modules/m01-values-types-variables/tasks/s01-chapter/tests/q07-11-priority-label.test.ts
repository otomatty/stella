// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { priorityLabel } from "../src/q07-11-priority-label";
test("問11 priorityLabel", () => {
  expect(priorityLabel(1)).toBe("高");
  expect(priorityLabel(3)).toBe("低");
  expectTypeOf(priorityLabel).parameters.toEqualTypeOf<[1 | 2 | 3]>();
  expectTypeOf(priorityLabel).returns.toEqualTypeOf<"高" | "中" | "低">();
});
