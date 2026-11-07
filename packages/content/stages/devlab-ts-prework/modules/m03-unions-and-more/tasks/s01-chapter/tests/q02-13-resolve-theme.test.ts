// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { resolveTheme, type Theme } from "../src/q02-13-resolve-theme";
test("問13 resolveTheme", () => {
  expectTypeOf<Theme>().toEqualTypeOf<"light" | "dark" | "system">();
  expect(resolveTheme("system", true)).toBe("dark");
  expect(resolveTheme("system", false)).toBe("light");
  expect(resolveTheme("light", true)).toBe("light");
  expectTypeOf(resolveTheme).parameters.toEqualTypeOf<[Theme, boolean]>();
  expectTypeOf(resolveTheme).returns.toEqualTypeOf<"light" | "dark">();
});
