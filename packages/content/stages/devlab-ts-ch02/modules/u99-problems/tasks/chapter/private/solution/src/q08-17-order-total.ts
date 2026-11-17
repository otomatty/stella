// 02-q08 インデックス型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/index-signature
//       https://typescriptbook.jp/reference/values-types-variables/object/how-to-loop-an-object

// 問17
export function orderTotal(
  prices: { [item: string]: number },
  order: { [item: string]: number },
): number {
  let total = 0;
  for (const [item, quantity] of Object.entries(order)) {
    const price = prices[item];
    if (price === undefined) {
      throw new Error(`${item} の価格がありません`);
    }
    total += price * quantity;
  }
  return total;
}
