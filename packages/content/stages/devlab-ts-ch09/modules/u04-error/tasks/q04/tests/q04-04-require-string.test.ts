// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { requireString } from "../src/q04-04-require-string";
test("問4 requireString", () => {
  expect(requireString("a")).toBe("a");
  expect(() => requireString(1)).toThrow(TypeError);
  expect(() => requireString(null)).toThrow("文字列ではありません");
  expectTypeOf(requireString).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(requireString).returns.toEqualTypeOf<string>();
});
