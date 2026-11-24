// 問9 金額を3桁ごとのカンマ区切りにし、「円」を付ける
//     例: priceText(1200) → "1,200円"
export function priceText(price: number): string {
  return `${price.toLocaleString("ja-JP")}円`;
}
