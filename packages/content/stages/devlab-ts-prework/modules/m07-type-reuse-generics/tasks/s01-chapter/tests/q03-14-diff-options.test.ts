// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { diffOptions, type Options } from "../src/q03-14-diff-options";
test("問14 diffOptions", () => {
  const a: Options = { size: 12, color: "black", bold: false };
  expect(diffOptions(a, { ...a, size: 20 })).toEqual({ size: 20 });
  expect(diffOptions(a, a)).toEqual({});
  expectTypeOf(diffOptions).parameters.toEqualTypeOf<[Options, Options]>();
  expectTypeOf(diffOptions).returns.toEqualTypeOf<Partial<Options>>();
});
