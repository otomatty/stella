// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { withDefaults, type Options } from "../src/q03-05-with-defaults";
test("問5 withDefaults", () => {
  expect(withDefaults({ size: 20 })).toEqual({ size: 20, color: "black", bold: false });
  expect(withDefaults({})).toEqual({ size: 12, color: "black", bold: false });
  expectTypeOf(withDefaults).parameters.toEqualTypeOf<[Partial<Options>]>();
  expectTypeOf(withDefaults).returns.toEqualTypeOf<Options>();
});
