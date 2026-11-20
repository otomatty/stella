// 04-q08 文字列の解析 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/exception
//       https://typescriptbook.jp/reference/statements/switch
//
// ★総合問題（コマンドの解析）で使う書き方を繰り返します。引数と戻り値には型注釈を付けること。
// 文字列を split や slice で分け、数値に変え、形がおかしければ Error を投げる。メッセージは問題文のとおりにする。
// 数値かどうかは Number(…) と Number.isFinite、整数かどうかは Number.isInteger で確かめる。

// 問19 整数の文字列なら { ok: true, value }、そうでなければ { ok: false, error: "整数ではありません: <text>" } を返す（例外は投げない）
//     例: tryParseInt("12") → { ok: true, value: 12 }
export function tryParseInt() {}
