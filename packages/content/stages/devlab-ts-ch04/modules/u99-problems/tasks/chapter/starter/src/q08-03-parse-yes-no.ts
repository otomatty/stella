// 04-q08 文字列の解析 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/exception
//       https://typescriptbook.jp/reference/statements/switch
//
// ★総合問題（コマンドの解析）で使う書き方を繰り返します。引数と戻り値には型注釈を付けること。
// 文字列を split や slice で分け、数値に変え、形がおかしければ Error を投げる。メッセージは問題文のとおりにする。
// 数値かどうかは Number(…) と Number.isFinite、整数かどうかは Number.isInteger で確かめる。

// 問3 "true"、"yes"、"1" は true、"false"、"no"、"0" は false にする（大文字小文字は問わない）。それ以外は "真偽値ではありません: <text>" の Error
//     例: parseYesNo("YES") → true
export function parseYesNo() {}
