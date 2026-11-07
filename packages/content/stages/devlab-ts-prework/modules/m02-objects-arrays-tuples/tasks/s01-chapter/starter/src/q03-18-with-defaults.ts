// 02-q03 分割代入とスプレッド構文 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/destructuring-assignment-from-objects
//       https://typescriptbook.jp/reference/values-types-variables/object/spread-syntax-for-object
//
// 商品 Item と利用者 User の型は定義済みです。引数と戻り値には型注釈を付けること。
// プロパティを取り出すときは const { name, price } = item; のような分割代入を使う。
// オブジェクトを変えるときは、元のオブジェクトを書き換えずに、{ ...item, price } のようにスプレッド構文で新しいオブジェクトを作る。

// 問18 { size?, color? } に、足りない値を size 10、color "black" で補ったオブジェクトを返す（既定値のオブジェクトの後ろに、スプレッドで重ねる）
//     例: withDefaults({ color: "red" }) → { size: 10, color: "red" }
export function withDefaults() {}
