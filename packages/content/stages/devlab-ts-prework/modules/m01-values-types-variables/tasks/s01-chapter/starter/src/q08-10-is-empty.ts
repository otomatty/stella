// 01-q08 any をなくす ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/any
//
// この関数は、引数と戻り値が any なので、型のチェックが効いていません。
// すべての any を正しい型に書き換えてください。中には、any のせいで見落とされているバグがあるものもあります。
// 型を直すと見つかるので、あわせて直すこと。文字列を + でつないでいるところは、テンプレートリテラルに書き換える。

// 問10 空の文字列なら true を返す
//     例: isEmpty("") → true
export function isEmpty(text: any): any {
  return (text.length = 0);
}
