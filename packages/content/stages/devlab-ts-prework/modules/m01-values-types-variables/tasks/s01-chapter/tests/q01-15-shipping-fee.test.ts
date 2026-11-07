// このファイルは書き換えないでください
import { expect, test } from "vitest";
import { shippingFee } from "../src/q01-15-shipping-fee";
test("問15 shippingFee", () => {
  expect(shippingFee(2000, false)).toBe(500);
  expect(shippingFee(3000, false)).toBe(0);
  expect(shippingFee(100, true)).toBe(0);
});
