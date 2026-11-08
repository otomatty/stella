// 04-q07 never型と網羅性のチェック ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/never
//
// 引数と戻り値には型注釈を付けること。
// 関数 assertNever と、型 Fruit、Signal、Op、Shape、LogLevel は定義済みです。
// ユニオン型の値で場合分けするときは switch で書き、すべての case を書いたうえで default では assertNever(値) を返す。
// こうしておくと、型に新しい値が増えたときに、書き忘れた switch が型エラーで分かる。

// 問13 "ここには来ないはずです" の Error を投げる関数。引数はなし、戻り値の型は never
//     例: unreachable() → Error "ここには来ないはずです"
export function unreachable() {}
