// 問3 stock だけを変えた新しい Item を返す
//     例: setStock(りんご, 0) → stock が 0 の新しい Item
// 引数と戻り値には型注釈を付けます。
// 定義済みの Item 型を使います。
// 元のオブジェクトを変えず、スプレッド構文で新しいオブジェクトを作ります。

export type Item = { id: number; name: string; price: number; stock: number };

export function setStock(item: Item, stock: number): Item {
  return { ...item, stock };
}
