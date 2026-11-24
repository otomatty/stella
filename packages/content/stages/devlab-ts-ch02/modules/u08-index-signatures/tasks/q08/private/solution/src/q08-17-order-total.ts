// 問17 価格表 prices と注文 order（商品ごとの個数）から合計金額を返す。価格表にない商品があれば Error を投げる
//     例: orderTotal({ りんご: 150, みかん: 80 }, { りんご: 2, みかん: 3 }) → 540
// 引数と戻り値には型注釈を付けます。
// キーが自由なオブジェクトの型は { [key: string]: number } の形で書きます。
// キーから取り出した値が undefined かどうかを確かめます。
// キーと値を順に見るには Object.entries を使います。
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
