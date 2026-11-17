// 04-q05 例外処理 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/exception
//
// 引数と戻り値には型注釈を付けること。
// 例外を投げるときは throw new Error("メッセージ")。メッセージは問題文のとおりにする。
// JSON.parse、new URL、decodeURIComponent、BigInt、String の repeat などは、おかしな値を渡すと例外を投げる。それを try-catch で受け止める問題もある。
// catch で受け取る値の型は unknown。使う前に instanceof Error などで絞り込む。

// 問18 JSON.parse(text) の結果を返す。読めなければ、元のエラーを cause に入れて「設定を読めません」の Error を投げる（new Error("設定を読めません", { cause: error })）
//     例: loadSettings("{") → Error "設定を読めません"
export function loadSettings() {}
