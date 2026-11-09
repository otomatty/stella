// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { initialsOf } from "../src/q03-20-initials-of";
test("問20 initialsOf", () => {
  expect(initialsOf("Taro", "Yamada")).toBe("T.Y");
  expect(initialsOf("Taro")).toBe("T");
  expectTypeOf(initialsOf).parameters.toEqualTypeOf<[string, string?]>();
  expectTypeOf(initialsOf).returns.toEqualTypeOf<string>();
});
