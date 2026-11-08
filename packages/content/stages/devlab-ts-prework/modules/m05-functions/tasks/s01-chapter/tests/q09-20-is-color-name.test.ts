// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isColorName } from "../src/q09-20-is-color-name";
test("問20 isColorName", () => {
  expect(isColorName("red")).toBe(true);
  expect(isColorName("pink")).toBe(false);
  expectTypeOf(isColorName).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(isColorName).guards.toEqualTypeOf<"red" | "green" | "blue">();
});
