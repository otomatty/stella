// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { capacity, type Vehicle } from "../src/q04-13-capacity";
test("問13 capacity", () => {
  expectTypeOf<Vehicle>().toEqualTypeOf<{ type: "car"; seats: number } | { type: "bike" }>();
  expect(capacity({ type: "car", seats: 5 })).toBe(5);
  expect(capacity({ type: "bike" })).toBe(1);
  expectTypeOf(capacity).parameters.toEqualTypeOf<[Vehicle]>();
  expectTypeOf(capacity).returns.toEqualTypeOf<number>();
});
