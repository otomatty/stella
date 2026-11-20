// 04-q05 例外処理 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/exception
//
// 引数と戻り値には型注釈を付けること。
// 例外を投げるときは throw new Error("メッセージ")。メッセージは問題文のとおりにする。
// JSON.parse、new URL、decodeURIComponent、BigInt、String の repeat などは、おかしな値を渡すと例外を投げる。それを try-catch で受け止める問題もある。
// catch で受け取る値の型は unknown。使う前に instanceof Error などで絞り込む。

// 問16 JSON の文字列から port（数値）を取り出す。JSON として読めないか、port が数値でなければ "port がありません" の Error を投げる
//     例: readPort('{"port":8080}') → 8080
export function readPort() {}
