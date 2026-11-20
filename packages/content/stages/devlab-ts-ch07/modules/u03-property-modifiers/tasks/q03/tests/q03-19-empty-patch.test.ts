// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { emptyPatch, type Options } from "../src/q03-19-empty-patch";
test("問19 emptyPatch", () => {
  expect(emptyPatch()).toEqual({});
  expectTypeOf(emptyPatch).parameters.toEqualTypeOf<[]>();
  expectTypeOf(emptyPatch).returns.toEqualTypeOf<Partial<Options>>();
});
