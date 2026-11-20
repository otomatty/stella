// 02-q03 分割代入とスプレッド構文 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/destructuring-assignment-from-objects
//       https://typescriptbook.jp/reference/values-types-variables/object/spread-syntax-for-object
//
// 商品 Item と利用者 User の型は定義済みです。引数と戻り値には型注釈を付けること。
// プロパティを取り出すときは const { name, price } = item; のような分割代入を使う。
// オブジェクトを変えるときは、元のオブジェクトを書き換えずに、{ ...item, price } のようにスプレッド構文で新しいオブジェクトを作る。

export type User = { id: number; name: string; age: number; email: string };

// 問9 分割代入で id と name を取り出し、{ id, name } だけのオブジェクトを返す
//     例: pickIdName(山田) → { id: 1, name: "山田" }
export function pickIdName() {}
