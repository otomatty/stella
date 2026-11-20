// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { formatValue } from "../src/q01-03-format-value";
test("問3 formatValue", () => {
  expect(formatValue(3.14159)).toBe("3.14");
  expect(formatValue("N/A")).toBe("N/A");
  expectTypeOf(formatValue).parameters.toEqualTypeOf<[string | number]>();
  expectTypeOf(formatValue).returns.toEqualTypeOf<string>();
});
