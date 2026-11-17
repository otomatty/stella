// 02-q03 分割代入とスプレッド構文 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/destructuring-assignment-from-objects
//       https://typescriptbook.jp/reference/values-types-variables/object/spread-syntax-for-object
//
// 商品 Item と利用者 User の型は定義済みです。引数と戻り値には型注釈を付けること。
// プロパティを取り出すときは const { name, price } = item; のような分割代入を使う。
// オブジェクトを変えるときは、元のオブジェクトを書き換えずに、{ ...item, price } のようにスプレッド構文で新しいオブジェクトを作る。

export type Item = { id: number; name: string; price: number; stock: number };

// 問1 分割代入で name と price を取り出し、「りんご 150円」の形にする
//     例: itemLabel(りんご) → "りんご 150円"
export function itemLabel() {}
