// 04-q08 文字列の解析 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/exception
//       https://typescriptbook.jp/reference/statements/switch
//
// ★総合問題（コマンドの解析）で使う書き方を繰り返します。引数と戻り値には型注釈を付けること。
// 文字列を split や slice で分け、数値に変え、形がおかしければ Error を投げる。メッセージは問題文のとおりにする。
// 数値かどうかは Number(…) と Number.isFinite、整数かどうかは Number.isInteger で確かめる。

// 問5 "2026-12-01" を [2026, 12, 1] にする。「-」で3つに分けられないか、整数でなければ "日付ではありません: <text>" の Error
//     例: parseDateParts("2026-12-01") → [2026, 12, 1]
export function parseDateParts() {}
