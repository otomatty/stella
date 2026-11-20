// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { invert } from "../src/q01-13-invert";
test("問13 invert", () => {
  const colors = new Map([
    ["red", "赤"],
    ["blue", "青"],
  ]);
  expect([...invert(colors).entries()]).toEqual([
    ["赤", "red"],
    ["青", "blue"],
  ]);
  expectTypeOf(invert).parameters.toEqualTypeOf<[Map<string, string>]>();
  expectTypeOf(invert).returns.toEqualTypeOf<Map<string, string>>();
});
