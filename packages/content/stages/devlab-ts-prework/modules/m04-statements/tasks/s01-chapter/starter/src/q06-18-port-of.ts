// 04-q06 unknown型と型の絞り込み ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/unknown
//       https://typescriptbook.jp/reference/statements/control-flow-analysis-and-type-guard
//
// 引数と戻り値には型注釈を付けること。
// unknown の値は、そのままでは使えない。typeof、instanceof、Array.isArray、=== null、"name" in value などで型を絞り込んでから使う。
// any は使わない。

// 問18 オブジェクトで port プロパティが数値ならそれを、そうでなければ 3000 を返す
//     例: portOf({ port: 8080 }) → 8080
export function portOf() {}
