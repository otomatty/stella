// 04-q07 never型と網羅性のチェック ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/never
//
// 引数と戻り値には型注釈を付けること。
// 関数 assertNever と、型 Fruit、Signal、Op、Shape、LogLevel は定義済みです。
// ユニオン型の値で場合分けするときは switch で書き、すべての case を書いたうえで default では assertNever(値) を返す。
// こうしておくと、型に新しい値が増えたときに、書き忘れた switch が型エラーで分かる。

export type Fruit = "apple" | "banana" | "cherry";

// 問14 文字列が Fruit のどれかなら、それを返す。違えば "果物ではありません: <text>" の Error を投げる
//     例: toFruit("apple") → "apple"
export function toFruit() {}
