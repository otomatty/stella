// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { patchOptions, type Options } from "../src/q03-06-patch-options";
test("問6 patchOptions", () => {
  const options: Options = { size: 12, color: "red", bold: false };
  expect(patchOptions(options, { bold: true })).toEqual({ size: 12, color: "red", bold: true });
  expect(options.bold).toBe(false);
  expectTypeOf(patchOptions).parameters.toEqualTypeOf<[Options, Partial<Options>]>();
  expectTypeOf(patchOptions).returns.toEqualTypeOf<Options>();
});
