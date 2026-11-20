// 02-q01 オブジェクトの型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/type-annotation-of-objects
//       https://typescriptbook.jp/reference/values-types-variables/object/shorthand-property-names
//
// 引数と戻り値には型注釈を付けること。
// オブジェクトの型は { name: string; age: number } のように書く。type で名前を付けてもよい。
// オブジェクトを作るときは { x: x } ではなく { x } のように、プロパティ名の省略記法を使う（ESLint でも確かめます）。

// 問15 2つのオブジェクト { name } の name が同じなら true
//     例: isSameName({ name: "山田" }, { name: "山田" }) → true
export function isSameName() {}
