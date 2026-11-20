// 05-q06 分割代入引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/destructuring-assignment-parameters
//       https://typescriptbook.jp/reference/functions/keyword-arguments-and-options-object-pattern

// 問6
export function priceText({
  price,
  currency = "円",
}: {
  price: number;
  currency?: string;
}): string {
  return `${price.toLocaleString("ja-JP")}${currency}`;
}
