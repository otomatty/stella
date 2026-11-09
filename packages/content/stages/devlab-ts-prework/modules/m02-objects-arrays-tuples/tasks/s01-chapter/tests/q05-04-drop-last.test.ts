// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { dropLast } from "../src/q05-04-drop-last";
test("問4 dropLast", () => {
  const items = ["a", "b", "c"];
  expect(dropLast(items)).toEqual(["a", "b"]);
  expect(items).toEqual(["a", "b", "c"]);
  expectTypeOf(dropLast).parameters.toEqualTypeOf<[readonly string[]]>();
  expectTypeOf(dropLast).returns.toEqualTypeOf<string[]>();
});
