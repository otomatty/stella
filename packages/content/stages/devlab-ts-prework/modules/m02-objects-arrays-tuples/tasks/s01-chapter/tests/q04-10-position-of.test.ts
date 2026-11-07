// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { positionOf } from "../src/q04-10-position-of";
test("問10 positionOf", () => {
  expect(positionOf(["a", "b"], "b")).toBe(1);
  expect(positionOf(["a", "b"], "c")).toBe(-1);
  expectTypeOf(positionOf).parameters.toEqualTypeOf<[readonly string[], string]>();
  expectTypeOf(positionOf).returns.toEqualTypeOf<number>();
});
