// 問11 型 Price（数値か "非売品"）を定義して export し、priceText(price: Price) を書く。数値なら「1,200円」、"非売品" ならそのまま
//     例: priceText(1200) → "1,200円"
// 引数と戻り値に型注釈を付ける。
// 文字列のリテラル値と === で比較し、場合を分ける。

export type Price = number | "非売品";

export function priceText(price: Price): string {
  return price === "非売品" ? price : `${price.toLocaleString("ja-JP")}円`;
}
