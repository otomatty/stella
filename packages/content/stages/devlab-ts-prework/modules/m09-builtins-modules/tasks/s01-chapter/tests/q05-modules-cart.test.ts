import { describe, expect, test } from "vitest";
import { ValidationError } from "../src/q04-error";
import { type CartItem, addItem, cartSummary, cartTotal } from "../src/q05-modules-cart";

const items: CartItem[] = [
  { name: "りんご", price: 100, quantity: 3 },
  { name: "みかん", price: 250, quantity: 2 },
];

describe("q05-modules-cart.ts", () => {
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
