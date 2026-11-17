// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { mergePatches, type Options } from "../src/q03-11-merge-patches";
test("問11 mergePatches", () => {
  expect(mergePatches({ size: 1 }, { size: 2, bold: true })).toEqual({ size: 2, bold: true });
  expect(mergePatches()).toEqual({});
  expectTypeOf(mergePatches).parameters.toEqualTypeOf<Partial<Options>[]>();
  expectTypeOf(mergePatches).returns.toEqualTypeOf<Partial<Options>>();
});
