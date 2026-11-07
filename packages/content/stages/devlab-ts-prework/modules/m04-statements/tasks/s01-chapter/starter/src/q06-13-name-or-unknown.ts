// 04-q06 unknown型と型の絞り込み ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/unknown
//       https://typescriptbook.jp/reference/statements/control-flow-analysis-and-type-guard
//
// 引数と戻り値には型注釈を付けること。
// unknown の値は、そのままでは使えない。typeof、instanceof、Array.isArray、=== null、"name" in value などで型を絞り込んでから使う。
// any は使わない。

// 問13 name プロパティが文字列ならそれを、そうでなければ "不明" を返す
//     例: nameOrUnknown({ name: "山田", age: 30 }) → "山田"
export function nameOrUnknown() {}
