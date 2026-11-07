// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { taxLabel } from "../src/q05-19-tax-label";
test("問19 taxLabel", () => {
  expect(taxLabel()).toBe("消費税 10%");
  expectTypeOf(taxLabel).parameters.toEqualTypeOf<[]>();
  expectTypeOf(taxLabel).returns.toEqualTypeOf<string>();
});
