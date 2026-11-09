// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { hasName } from "../src/q06-12-has-name";
test("問12 hasName", () => {
  expect(hasName({ name: "山田" })).toBe(true);
  expect(hasName({ name: 1 })).toBe(false);
  expect(hasName(null)).toBe(false);
  expect(hasName("山田")).toBe(false);
  expectTypeOf(hasName).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(hasName).returns.toEqualTypeOf<boolean>();
});
