// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { contains } from "../src/q08-15-contains";
test("問15 contains", () => {
  expect(contains("TypeScript", "Script")).toBe(true);
  expect(contains("TypeScript", "Java")).toBe(false);
  expectTypeOf(contains).parameters.toEqualTypeOf<[string, string]>();
  expectTypeOf(contains).returns.toEqualTypeOf<boolean>();
});
