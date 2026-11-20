// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { priorityWeight } from "../src/q02-20-priority-weight";
test("問20 priorityWeight", () => {
  expect(priorityWeight("high")).toBe(3);
  expect(priorityWeight("middle")).toBe(2);
  expect(priorityWeight("low")).toBe(1);
  expectTypeOf(priorityWeight).parameters.toEqualTypeOf<["high" | "middle" | "low"]>();
  expectTypeOf(priorityWeight).returns.toEqualTypeOf<number>();
});
