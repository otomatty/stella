// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { colorCode } from "../src/q02-10-color-code";
test("問10 colorCode", () => {
  expect(colorCode("green")).toBe("#00ff00");
  expectTypeOf(colorCode).parameters.toEqualTypeOf<["red" | "green" | "blue"]>();
  expectTypeOf(colorCode).returns.toEqualTypeOf<string>();
});
