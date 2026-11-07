// 04-q08 文字列の解析 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/exception
//       https://typescriptbook.jp/reference/statements/switch
//
// ★総合問題（コマンドの解析）で使う書き方を繰り返します。引数と戻り値には型注釈を付けること。
// 文字列を split や slice で分け、数値に変え、形がおかしければ Error を投げる。メッセージは問題文のとおりにする。
// 数値かどうかは Number(…) と Number.isFinite、整数かどうかは Number.isInteger で確かめる。

// 問2 "1,2,3" を [1, 2, 3] にする。前後の空白は無視する。数値でないものがあれば "数値ではありません: <その部分>" の Error を投げる
//     例: parseNumberList("1, 2,3") → [1, 2, 3]
export function parseNumberList() {}
