// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { priorityPoint, type Priority } from "../src/q07-12-priority-point";
test("問12 priorityPoint", () => {
  expect(priorityPoint("high")).toBe(3);
  expect(priorityPoint("low")).toBe(1);
  expectTypeOf(priorityPoint).parameters.toEqualTypeOf<[Priority]>();
  expectTypeOf(priorityPoint).returns.toEqualTypeOf<number>();
});
