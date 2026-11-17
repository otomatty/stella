// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { firstDefined } from "../src/q05-12-first-defined";
test("問12 firstDefined", () => {
  expect(firstDefined(undefined, "a", "b")).toBe("a");
  expect(firstDefined(undefined)).toBeUndefined();
  expectTypeOf(firstDefined).parameters.toEqualTypeOf<(string | undefined)[]>();
  expectTypeOf(firstDefined).returns.toEqualTypeOf<string | undefined>();
});
