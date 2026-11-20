// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { toggleBold, type Options } from "../src/q03-15-toggle-bold";
test("問15 toggleBold", () => {
  expect(toggleBold({ size: 12, color: "black", bold: false }).bold).toBe(true);
  expectTypeOf(toggleBold).parameters.toEqualTypeOf<[Readonly<Options>]>();
  expectTypeOf(toggleBold).returns.toEqualTypeOf<Options>();
});
