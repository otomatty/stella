import { describe, expect, expectTypeOf, test } from "vitest";
import * as shop from "../src/q05-modules";
import { type CartItem, addItem, cartSummary, cartTotal } from "../src/q05-modules/cart";
import formatYen from "../src/q05-modules/format";
import { TAX_RATE, priceWithTax } from "../src/q05-modules/price";
import { ValidationError } from "../src/q04-error";

const items: CartItem[] = [
  { name: "りんご", price: 100, quantity: 3 },
  { name: "みかん", price: 250, quantity: 2 },
];

describe("q05-modules/price.ts", () => {
  test("TAX_RATE と priceWithTax", () => {
    expect(TAX_RATE).toBe(0.1);
    expect(priceWithTax(100)).toBe(110);
  });
});

describe("q05-modules/format.ts", () => {
  test("formatYen はデフォルト export", () => {
    expect(formatYen(1234)).toBe("1,234円");
  });
});

describe("q05-modules/cart.ts", () => {
  test("addItem", () => {
    expect(addItem(items, { name: "ぶどう", price: 500, quantity: 1 })).toHaveLength(3);
    expect(addItem(items, { name: "りんご", price: 100, quantity: 2 })[0]?.quantity).toBe(5);
    expect(items[0]?.quantity).toBe(3);
  });

  test("数量が1以上の整数でなければ ValidationError を投げる", () => {
    expect(() => addItem(items, { name: "ぶどう", price: 500, quantity: 0 })).toThrow(
      ValidationError,
    );
    expect(() => addItem(items, { name: "ぶどう", price: 500, quantity: 1.5 })).toThrow(
      "数量は1以上の整数にしてください",
    );
  });

  test("cartTotal と cartSummary", () => {
    expect(cartTotal(items)).toBe(880);
    expect(cartSummary(items)).toBe("2種類 合計880円");
  });
});

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
