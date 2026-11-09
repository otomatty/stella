import { describe, expect, test } from "vitest";
import { TAX_RATE, priceWithTax } from "../src/q05-modules-price";

describe("q05-modules-price.ts", () => {
  test("TAX_RATE と priceWithTax", () => {
    expect(TAX_RATE).toBe(0.1);
    expect(priceWithTax(100)).toBe(110);
  });
});
