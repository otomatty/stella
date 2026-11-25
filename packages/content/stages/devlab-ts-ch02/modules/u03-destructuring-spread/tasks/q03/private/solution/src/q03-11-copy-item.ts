// 問11 中身が同じで、別のオブジェクトになった Item を返す
//     例: copyItem(りんご) → りんごと同じ中身の、新しい Item
// 引数と戻り値には型注釈を付けます。
// 定義済みの Item 型を使います。
// 元のオブジェクトを変えず、スプレッド構文で新しいオブジェクトを作ります。

export type Item = { id: number; name: string; price: number; stock: number };

export function copyItem(item: Item): Item {
  return { ...item };
}
