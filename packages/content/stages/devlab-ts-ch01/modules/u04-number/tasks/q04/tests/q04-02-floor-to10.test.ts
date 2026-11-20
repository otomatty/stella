// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { floorTo10 } from "../src/q04-02-floor-to10";
test("問2 floorTo10", () => {
  expect(floorTo10(123)).toBe(120);
  expect(floorTo10(9)).toBe(0);
  expectTypeOf(floorTo10).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(floorTo10).returns.toEqualTypeOf<number>();
});
