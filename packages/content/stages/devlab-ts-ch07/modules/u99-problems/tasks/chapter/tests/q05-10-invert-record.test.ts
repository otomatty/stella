// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { invertRecord } from "../src/q05-10-invert-record";
test("問10 invertRecord", () => {
  expect(invertRecord({ a: "x", b: "y" })).toEqual({ x: "a", y: "b" });
  expectTypeOf(invertRecord).parameters.toEqualTypeOf<[Record<string, string>]>();
  expectTypeOf(invertRecord).returns.toEqualTypeOf<Record<string, string>>();
});
