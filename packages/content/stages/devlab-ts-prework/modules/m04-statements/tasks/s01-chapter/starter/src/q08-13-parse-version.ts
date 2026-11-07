// 04-q08 文字列の解析 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/exception
//       https://typescriptbook.jp/reference/statements/switch
//
// ★総合問題（コマンドの解析）で使う書き方を繰り返します。引数と戻り値には型注釈を付けること。
// 文字列を split や slice で分け、数値に変え、形がおかしければ Error を投げる。メッセージは問題文のとおりにする。
// 数値かどうかは Number(…) と Number.isFinite、整数かどうかは Number.isInteger で確かめる。

// 問13 "1.2.3" を [1, 2, 3] にする。「.」で3つの0以上の整数に分けられなければ "バージョンではありません: <text>" の Error
//     例: parseVersion("1.12.0") → [1, 12, 0]
export function parseVersion() {}
