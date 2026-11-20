// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { capitalize } from "../src/q05-12-capitalize";
test("問12 capitalize", () => {
  expect(capitalize("hello")).toBe("Hello");
  expect(capitalize("a")).toBe("A");
  expect(capitalize("")).toBe("");
  expectTypeOf(capitalize).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(capitalize).returns.toEqualTypeOf<string>();
});
