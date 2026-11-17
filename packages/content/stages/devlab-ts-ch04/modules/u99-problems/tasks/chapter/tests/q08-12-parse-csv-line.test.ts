// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { parseCsvLine } from "../src/q08-12-parse-csv-line";
test("問12 parseCsvLine", () => {
  expect(parseCsvLine("a, b ,c")).toEqual(["a", "b", "c"]);
  expect(parseCsvLine("x")).toEqual(["x"]);
  expectTypeOf(parseCsvLine).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(parseCsvLine).returns.toEqualTypeOf<string[]>();
});
