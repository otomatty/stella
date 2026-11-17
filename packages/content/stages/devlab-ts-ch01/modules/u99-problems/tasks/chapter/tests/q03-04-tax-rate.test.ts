// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { TAX_RATE } from "../src/q03-04-tax-rate";
test("問4 TAX_RATE", () => {
  expect(TAX_RATE).toBe(0.1);
  expectTypeOf<typeof TAX_RATE>().toEqualTypeOf<0.1>();
});
