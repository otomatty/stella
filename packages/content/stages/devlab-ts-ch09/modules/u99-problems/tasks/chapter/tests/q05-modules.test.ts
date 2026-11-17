import { describe, expect, expectTypeOf, test } from "vitest";
import { type CartItem, addItem, cartSummary, cartTotal } from "../src/q05-modules-cart";
import formatYen from "../src/q05-modules-format";
import * as shop from "../src/q05-modules";
import { TAX_RATE, priceWithTax } from "../src/q05-modules-price";

describe("q05-modules.ts", () => {
  test("re-export したものは、元のファイルのものと同じ", () => {
    expect(shop.addItem).toBe(addItem);
    expect(shop.cartTotal).toBe(cartTotal);
    expect(shop.cartSummary).toBe(cartSummary);
    expect(shop.priceWithTax).toBe(priceWithTax);
    expect(shop.TAX_RATE).toBe(TAX_RATE);
    expect(shop.formatYen).toBe(formatYen);
  });

  test("re-export だけを書いている（定義やデフォルト export が残っていない）", () => {
    expect(Object.keys(shop).sort()).toEqual([
      "TAX_RATE",
      "addItem",
      "cartSummary",
      "cartTotal",
      "formatYen",
      "priceWithTax",
    ]);
  });

  test("型も re-export されている", () => {
    expectTypeOf<shop.CartItem>().toEqualTypeOf<CartItem>();
  });
});
