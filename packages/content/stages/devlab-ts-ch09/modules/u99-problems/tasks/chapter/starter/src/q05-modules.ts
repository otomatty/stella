// 09-q05 ★総合問題 モジュールに分ける
//
// 教材: https://typescriptbook.jp/reference/import-export-require
//
// 問題
// 下のコードは、ネットショップのカートの計算を1つのファイルにまとめたものです。
// これを q05-modules-price.ts、q05-modules-format.ts、q05-modules-cart.ts の3つのファイルに分け、このファイル（q05-modules.ts）には re-export だけを書いてください。
// q05-modules-cart.ts に足す確かめ以外は、関数の中身は変えずに、置き場所だけを変えること。
//
//   q05-modules-price.ts   TAX_RATE と priceWithTax を、名前付き export にする
//   q05-modules-format.ts  formatYen を、デフォルト export にする
//   q05-modules-cart.ts    型 CartItem と、addItem・cartTotal・cartSummary を、名前付き export にする。
//                          q05-modules-price.ts と q05-modules-format.ts から、使うものを import する
//
// このファイル（q05-modules.ts）には、次の3つの re-export だけを書く（関数や型の定義は残さない）
//   - q05-modules-cart.ts の export をすべて re-export する（export * from …）
//   - q05-modules-price.ts の TAX_RATE と priceWithTax を re-export する
//   - q05-modules-format.ts のデフォルト export を、formatYen という名前で re-export する
//
// テスト（q05-modules.test.ts）は、それぞれのファイルから import して確かめます。
//
// 説明すること（答えは、この下に // のコメントで書く）
// - 名前付き export とデフォルト export の違い。自分ならどちらを使うか、その理由

import { ValidationError } from "./q04-error";

export const TAX_RATE = 0.1;

export type CartItem = { name: string; price: number; quantity: number };

export function priceWithTax(price: number): number {
  return Math.round(price * (1 + TAX_RATE));
}

export default function formatYen(amount: number): string {
  return `${amount.toLocaleString("ja-JP")}円`;
}

// 同じ名前の商品があれば数を足し、なければ末尾に足した新しい配列を返す
export function addItem(items: readonly CartItem[], item: CartItem): CartItem[] {
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
