// 02-q08 インデックス型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/index-signature
//       https://typescriptbook.jp/reference/values-types-variables/object/how-to-loop-an-object

// 問16
export function priceOf(prices: { [item: string]: number }, item: string): number {
  const price = prices[item];
  if (price === undefined) {
    throw new Error(`${item} の価格がありません`);
  }
  return price;
}
