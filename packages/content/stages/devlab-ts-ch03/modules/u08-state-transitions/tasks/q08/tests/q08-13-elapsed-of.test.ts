// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { elapsedOf, type Timer } from "../src/q08-13-elapsed-of";
test("問13 elapsedOf", () => {
  expect(elapsedOf({ state: "idle" }, 1800)).toBe(0);
  expect(elapsedOf({ state: "running", startedAt: 1000 }, 1800)).toBe(800);
  expect(elapsedOf({ state: "paused", elapsed: 300 }, 1800)).toBe(300);
  expectTypeOf(elapsedOf).parameters.toEqualTypeOf<[Timer, number]>();
  expectTypeOf(elapsedOf).returns.toEqualTypeOf<number>();
});
