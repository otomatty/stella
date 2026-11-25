// 問4 stock を amount だけ増やした新しい Item を返す
//     例: addStock(在庫12のりんご, 8) → stock が 20 の新しい Item
// 引数と戻り値には型注釈を付けます。
// 定義済みの Item 型を使います。
// 元のオブジェクトを変えず、スプレッド構文で新しいオブジェクトを作ります。

export type Item = { id: number; name: string; price: number; stock: number };

export function addStock(item: Item, amount: number): Item {
  return { ...item, stock: item.stock + amount };
}
