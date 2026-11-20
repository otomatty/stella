// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { withDefaults } from "../src/q03-18-with-defaults";
test("問18 withDefaults", () => {
  expect(withDefaults({ color: "red" })).toEqual({ size: 10, color: "red" });
  expect(withDefaults({})).toEqual({ size: 10, color: "black" });
  expect(withDefaults({ size: 20, color: "blue" })).toEqual({ size: 20, color: "blue" });
  expectTypeOf(withDefaults).parameters.toEqualTypeOf<[{ size?: number; color?: string }]>();
  expectTypeOf(withDefaults).returns.toEqualTypeOf<{ size: number; color: string }>();
});
