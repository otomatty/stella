// 問題
// q05-modules.ts から、型 CartItem と、addItem・cartTotal・cartSummary をこのファイルに移し、名前付き export にする。
// q05-modules-price.ts と q05-modules-format.ts から、使うものを import する。
// 関数の中身は変えないこと。
//
// このファイルに書くクラス
// ValidationError は Error を継承する。constructor(field, message) で、どの項目のエラーかを表す
// field（文字列）を readonly で持つ。name は "ValidationError" にする。
// テストがこのファイルから読み込めるように、名前付き export にする。
// addItem は、item.quantity が1以上の整数でなければ、
// new ValidationError("quantity", "数量は1以上の整数にしてください") を投げる（元のコードにはない確かめなので足す）。

import formatYen from "./q05-modules-format";
import { priceWithTax } from "./q05-modules-price";

export class ValidationError extends Error {
  readonly field: string;

  constructor(field: string, message: string) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
  }
}

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
