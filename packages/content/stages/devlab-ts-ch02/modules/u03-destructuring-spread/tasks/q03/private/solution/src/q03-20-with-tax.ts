// 問20 price を税込（10%。1円未満は切り捨て）にした新しい Item を返す
//     例: withTax(150円のりんご) → price が 165 の新しい Item
// 引数と戻り値には型注釈を付けます。
// 定義済みの Item 型を使います。
// 元のオブジェクトを変えず、スプレッド構文で新しいオブジェクトを作ります。

export type Item = { id: number; name: string; price: number; stock: number };

export function withTax(item: Item): Item {
  return { ...item, price: Math.floor((item.price * 110) / 100) };
}
