// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { parseOperator } from "../src/q08-15-parse-operator";
test("問15 parseOperator", () => {
  expect(parseOperator("*")).toBe("*");
  expect(() => parseOperator("%")).toThrow("演算子ではありません: %");
  expectTypeOf(parseOperator).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(parseOperator).returns.toEqualTypeOf<"+" | "-" | "*" | "/">();
});
