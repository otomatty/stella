// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { planLimit } from "../src/q02-05-plan-limit";
test("問5 planLimit", () => {
  expect(planLimit("free")).toBe(1);
  expect(planLimit("pro")).toBe(10);
  expect(planLimit("team")).toBe(100);
  expectTypeOf(planLimit).parameters.toEqualTypeOf<["free" | "pro" | "team"]>();
  expectTypeOf(planLimit).returns.toEqualTypeOf<number>();
});
