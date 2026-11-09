// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { resetKeys, type Options } from "../src/q03-20-reset-keys";
test("問20 resetKeys", () => {
  expect(resetKeys({ size: 20, color: "red", bold: true }, ["size"])).toEqual({
    size: 12,
    color: "red",
    bold: true,
  });
  expect(resetKeys({ size: 20, color: "red", bold: true }, ["color", "bold"])).toEqual({
    size: 20,
    color: "black",
    bold: false,
  });
  expectTypeOf(resetKeys).parameters.toEqualTypeOf<
    [Options, readonly ("size" | "color" | "bold")[]]
  >();
  expectTypeOf(resetKeys).returns.toEqualTypeOf<Options>();
});
