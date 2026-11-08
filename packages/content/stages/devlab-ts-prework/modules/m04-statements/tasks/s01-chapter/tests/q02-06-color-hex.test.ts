// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { colorHex } from "../src/q02-06-color-hex";
test("問6 colorHex", () => {
  expect(colorHex("red")).toBe("#ff0000");
  expect(colorHex("green")).toBe("#00ff00");
  expect(colorHex("blue")).toBe("#0000ff");
  expectTypeOf(colorHex).parameters.toEqualTypeOf<["red" | "green" | "blue"]>();
  expectTypeOf(colorHex).returns.toEqualTypeOf<string>();
});
