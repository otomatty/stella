import { ValidationError } from "../q04-error";
import formatYen from "./format";
import { priceWithTax } from "./price";

export type CartItem = { name: string; price: number; quantity: number };

// 同じ名前の商品があれば数を足し、なければ末尾に足した新しい配列を返す
export function addItem(items: readonly CartItem[], item: CartItem): CartItem[] {
  if (!Number.isInteger(item.quantity) || item.quantity < 1) {
    throw new ValidationError("quantity", "数量は1以上の整数にしてください");
  }
  if (!items.some((i) => i.name === item.name)) {
    return [...items, item];
  }
  return items.map((i) =>
    i.name === item.name ? { ...i, quantity: i.quantity + item.quantity } : i,
  );
}

// 税込みの合計金額
export function cartTotal(items: readonly CartItem[]): number {
  return items.reduce((sum, i) => sum + priceWithTax(i.price) * i.quantity, 0);
}

// "2種類 合計880円" の形の文字列
export function cartSummary(items: readonly CartItem[]): string {
  return `${items.length}種類 合計${formatYen(cartTotal(items))}`;
}
