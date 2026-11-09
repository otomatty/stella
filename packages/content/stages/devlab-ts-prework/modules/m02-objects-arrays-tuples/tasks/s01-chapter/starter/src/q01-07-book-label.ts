// 02-q01 オブジェクトの型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/type-annotation-of-objects
//       https://typescriptbook.jp/reference/values-types-variables/object/shorthand-property-names
//
// 引数と戻り値には型注釈を付けること。
// オブジェクトの型は { name: string; age: number } のように書く。type で名前を付けてもよい。
// オブジェクトを作るときは { x: x } ではなく { x } のように、プロパティ名の省略記法を使う（ESLint でも確かめます）。

// 問7 本 { title, price } を「タイトル（価格円）」にする。価格は3桁ごとにカンマで区切る
//     例: bookLabel({ title: "TypeScript入門", price: 2800 }) → "TypeScript入門（2,800円）"
export function bookLabel() {}
