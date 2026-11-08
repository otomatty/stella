// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { buildUrl } from "../src/q03-18-build-url";
test("問18 buildUrl", () => {
  expect(buildUrl("/search", "q=ts")).toBe("/search?q=ts");
  expect(buildUrl("/home")).toBe("/home");
  expectTypeOf(buildUrl).parameters.toEqualTypeOf<[string, string?]>();
  expectTypeOf(buildUrl).returns.toEqualTypeOf<string>();
});
