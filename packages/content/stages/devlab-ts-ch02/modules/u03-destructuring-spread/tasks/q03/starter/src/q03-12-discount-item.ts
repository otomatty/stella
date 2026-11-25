// 問12 price を percentOff パーセント引き（1円未満は切り捨て）にした新しい Item を返す
//     例: discountItem(150円のりんご, 10) → price が 135 の新しい Item
// 引数と戻り値には型注釈を付けます。
// 定義済みの Item 型を使います。
// 元のオブジェクトを変えず、スプレッド構文で新しいオブジェクトを作ります。

export type Item = { id: number; name: string; price: number; stock: number };

export function discountItem() {}
