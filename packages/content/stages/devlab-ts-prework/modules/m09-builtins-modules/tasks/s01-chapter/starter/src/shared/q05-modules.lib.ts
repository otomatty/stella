// 09-q05 のドリルで import するためのファイルです。書き換えないでください

export const SITE_NAME = "サンプル商店";
export const TAX_RATE = 0.1;

export type Product = { name: string; price: number };

export const products: readonly Product[] = [
  { name: "りんご", price: 120 },
  { name: "みかん", price: 80 },
  { name: "ぶどう", price: 450 },
];

export function priceWithTax(price: number): number {
  return Math.round(price * (1 + TAX_RATE));
}

export function formatYen(amount: number): string {
  return `${amount.toLocaleString("ja-JP")}円`;
}

export default function greet(name: string): string {
  return `ようこそ、${name}さん`;
}
