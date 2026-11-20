// 03-q01 型エイリアスとユニオン型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/type-alias
//       https://typescriptbook.jp/reference/values-types-variables/union

// 問11
export type Price = number | "非売品";

export function priceText(price: Price): string {
  return price === "非売品" ? price : `${price.toLocaleString("ja-JP")}円`;
}
