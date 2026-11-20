// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { typeLabel } from "../src/q01-07-type-label";
test("問7 typeLabel", () => {
  expect(typeLabel("a")).toBe("文字列");
  expect(typeLabel(1)).toBe("数値");
  expect(typeLabel(true)).toBe("真偽値");
  expectTypeOf(typeLabel).parameters.toEqualTypeOf<[string | number | boolean]>();
  expectTypeOf(typeLabel).returns.toEqualTypeOf<"文字列" | "数値" | "真偽値">();
});
