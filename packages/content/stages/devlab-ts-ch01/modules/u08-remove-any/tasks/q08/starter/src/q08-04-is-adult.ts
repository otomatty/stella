// 01-q08 any をなくす ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/any
//
// この関数は、引数と戻り値が any なので、型のチェックが効いていません。
// すべての any を正しい型に書き換えてください。中には、any のせいで見落とされているバグがあるものもあります。
// 型を直すと見つかるので、あわせて直すこと。文字列を + でつないでいるところは、テンプレートリテラルに書き換える。

// 問4 20歳以上なら true を返す
//     例: isAdult(20) → true
export function isAdult(age: any): any {
  return age >= 20;
}
