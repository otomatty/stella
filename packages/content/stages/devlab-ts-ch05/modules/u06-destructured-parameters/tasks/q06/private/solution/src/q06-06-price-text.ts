// 問6 { price, currency } を「1,200円」の形にする。currency を省略したら「円」
//     例: priceText({ price: 1200 }) → "1,200円"
// 引数と戻り値には型注釈を付けてください。
// オブジェクトは引数の位置で分割代入してください。
// 省略できるプロパティには型で ? を付け、分割代入でデフォルト値を指定してください。

export function priceText({
  price,
  currency = "円",
}: {
  price: number;
  currency?: string;
}): string {
  return `${price.toLocaleString("ja-JP")}${currency}`;
}
