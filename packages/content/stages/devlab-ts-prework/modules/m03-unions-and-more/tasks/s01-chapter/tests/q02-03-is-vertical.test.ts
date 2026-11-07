// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isVertical, type Direction } from "../src/q02-03-is-vertical";
test("問3 isVertical", () => {
  expect(isVertical("down")).toBe(true);
  expect(isVertical("left")).toBe(false);
  expectTypeOf(isVertical).parameters.toEqualTypeOf<[Direction]>();
  expectTypeOf(isVertical).returns.toEqualTypeOf<boolean>();
});
