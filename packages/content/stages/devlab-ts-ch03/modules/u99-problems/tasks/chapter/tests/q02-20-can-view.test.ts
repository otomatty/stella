// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { canView, type Visibility } from "../src/q02-20-can-view";
test("問20 canView", () => {
  expectTypeOf<Visibility>().toEqualTypeOf<"public" | "private">();
  expect(canView("public", false)).toBe(true);
  expect(canView("private", false)).toBe(false);
  expect(canView("private", true)).toBe(true);
  expectTypeOf(canView).parameters.toEqualTypeOf<[Visibility, boolean]>();
  expectTypeOf(canView).returns.toEqualTypeOf<boolean>();
});
