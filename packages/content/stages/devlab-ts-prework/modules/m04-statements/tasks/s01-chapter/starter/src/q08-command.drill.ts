// 04-q08 文字列の解析 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/exception
//       https://typescriptbook.jp/reference/statements/switch
//
// ★総合問題（コマンドの解析）で使う書き方を繰り返します。次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。
// 文字列を split や slice で分け、数値に変え、形がおかしければ Error を投げる。メッセージは問題文のとおりにする。
// 数値かどうかは Number(…) と Number.isFinite、整数かどうかは Number.isInteger で確かめる。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

// 問1 "key=value" を [key, value] にする。「=」がなければ "= がありません: <text>" の Error を投げる（最初の「=」で分ける）
//     例: parseKeyValue("a=1") → ["a", "1"]
export function parseKeyValue() {}

// 問2 "1,2,3" を [1, 2, 3] にする。前後の空白は無視する。数値でないものがあれば "数値ではありません: <その部分>" の Error を投げる
//     例: parseNumberList("1, 2,3") → [1, 2, 3]
export function parseNumberList() {}

// 問3 "true"、"yes"、"1" は true、"false"、"no"、"0" は false にする（大文字小文字は問わない）。それ以外は "真偽値ではありません: <text>" の Error
//     例: parseYesNo("YES") → true
export function parseYesNo() {}

// 問4 "09:30" を、0時からの分（570）にする。時が 0〜23、分が 0〜59 の整数でなければ "時刻ではありません: <text>" の Error
//     例: parseClock("09:30") → 570
export function parseClock() {}

// 問5 "2026-12-01" を [2026, 12, 1] にする。「-」で3つに分けられないか、整数でなければ "日付ではありません: <text>" の Error
//     例: parseDateParts("2026-12-01") → [2026, 12, 1]
export function parseDateParts() {}

// 問6 "10KB" をバイト数にする。単位は "B"、"KB"（1024）、"MB"（1024 × 1024）。それ以外は "大きさではありません: <text>" の Error
//     例: parseByteSize("2KB") → 2048
export function parseByteSize() {}

// 問7 "90s"、"5m"、"2h" を秒にする（s は秒、m は分、h は時間）。それ以外は "時間ではありません: <text>" の Error
//     例: parseSeconds("5m") → 300
export function parseSeconds() {}

// 問8 "3-7" を [3, 7] にする。数値でないか、始まりが終わりより大きければ "範囲ではありません: <text>" の Error
//     例: parseRange("3-7") → [3, 7]
export function parseRange() {}

// 問9 "#ff0000" を [255, 0, 0] にする（Number.parseInt(…, 16)）。「#」と16進数6桁でなければ "色ではありません: <text>" の Error
//     例: parseHexColor("#00ff80") → [0, 255, 128]
export function parseHexColor() {}

// 問10 "50%" を 0.5 にする。「%」で終わっていないか、数値でなければ "割合ではありません: <text>" の Error
//     例: parseRatio("50%") → 0.5
export function parseRatio() {}

// 問11 "a=1&b=2" を { a: "1", b: "2" } にする。空の文字列なら {}。「=」のない部分は値を空の文字列にする
//     例: parseQuery("a=1&b=2") → { a: "1", b: "2" }
export function parseQuery() {}

// 問12 "a, b ,c" を、「,」で分けて前後の空白を取り除いた配列にする
//     例: parseCsvLine("a, b ,c") → ["a", "b", "c"]
export function parseCsvLine() {}

// 問13 "1.2.3" を [1, 2, 3] にする。「.」で3つの0以上の整数に分けられなければ "バージョンではありません: <text>" の Error
//     例: parseVersion("1.12.0") → [1, 12, 0]
export function parseVersion() {}

// 問14 "1.2.3" の形の2つのバージョンを比べ、a が古ければ -1、同じなら 0、新しければ 1 を返す（数値として比べる）
//     例: compareVersions("1.9.0", "1.10.0") → -1
export function compareVersions() {}

// 問15 "+"、"-"、"*"、"/" ならそのまま返す。それ以外は "演算子ではありません: <text>" の Error
//     例: parseOperator("*") → "*"
export function parseOperator() {}

// 問16 "3 + 4" のような「数 演算子 数」を計算する。形がおかしければ "式ではありません: <text>"、0 で割れば "0で割ることはできません" の Error
//     例: evaluate("6 / 3") → 2
export function evaluate() {}

// 問17 前後の空白を取り除き、最初の単語を小文字にして返す。空なら "コマンドがありません" の Error
//     例: commandName("  ADD 1 2") → "add"
export function commandName() {}

// 問18 最初の単語より後ろの単語を、配列で返す（空白がいくつ続いてもよい）
//     例: commandArgs("add  1   2") → ["1", "2"]
export function commandArgs() {}

// 問19 整数の文字列なら { ok: true, value }、そうでなければ { ok: false, error: "整数ではありません: <text>" } を返す（例外は投げない）
//     例: tryParseInt("12") → { ok: true, value: 12 }
export function tryParseInt() {}

// 問20 改行で分け、前後の空白を取り除き、空の行を除いた配列を返す
//     例: nonEmptyLines("a\n\n b \n") → ["a", "b"]
export function nonEmptyLines() {}
