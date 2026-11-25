// 問16 価格表から item の価格を返す。なければ Error を投げる
//     例: priceOf({ りんご: 150 }, "りんご") → 150
// 引数と戻り値には型注釈を付けます。
// キーが自由なオブジェクトの型は { [key: string]: number } の形で書きます。
// キーから取り出した値が undefined かどうかを確かめます。
export function priceOf(prices: { [item: string]: number }, item: string): number {
  const price = prices[item];
  if (price === undefined) {
    throw new Error(`${item} の価格がありません`);
  }
  return price;
}
