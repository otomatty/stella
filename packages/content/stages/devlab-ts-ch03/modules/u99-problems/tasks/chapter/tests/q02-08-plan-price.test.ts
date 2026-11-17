// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { planPrice, type Plan } from "../src/q02-08-plan-price";
test("問8 planPrice", () => {
  expect(planPrice("free")).toBe(0);
  expect(planPrice("pro")).toBe(1000);
  expect(planPrice("enterprise")).toBe(5000);
  expectTypeOf(planPrice).parameters.toEqualTypeOf<[Plan]>();
  expectTypeOf(planPrice).returns.toEqualTypeOf<number>();
});
