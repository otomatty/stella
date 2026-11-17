// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { stairs } from "../src/q03-20-stairs";
test("問20 stairs", () => {
  expect(stairs(3)).toEqual(["*", "**", "***"]);
  expect(stairs(0)).toEqual([]);
  expectTypeOf(stairs).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(stairs).returns.toEqualTypeOf<string[]>();
});
