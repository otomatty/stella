// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { dedupe } from "../src/q03-19-dedupe";
test("問19 dedupe", () => {
  expect(dedupe(["a", "b", "a", "c", "b"])).toEqual(["a", "b", "c"]);
  expect(dedupe([])).toEqual([]);
  expectTypeOf(dedupe).parameters.toEqualTypeOf<[readonly string[]]>();
  expectTypeOf(dedupe).returns.toEqualTypeOf<string[]>();
});
