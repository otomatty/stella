// 05-q04 デフォルト引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/default-parameters
//
// 次の20個の関数を書いてください。
// 「省略したら◯◯」と書いた引数は、times = 2 のようにデフォルト引数で書く。デフォルト値を書いた引数には型注釈を書かない（値から推論される。ESLint の no-inferrable-types）。
// それ以外の引数と戻り値には型注釈を付けること。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

// 問1 省略できる name を受け取り「こんにちは、◯◯さん」を返す。省略したら「ゲスト」
//     例: greetGuest() → "こんにちは、ゲストさん"
export function greetGuest() {}

// 問2 base を exponent 乗する。exponent を省略したら 2
//     例: powerOf(3) → 9
export function powerOf() {}

// 問3 全件数 total を perPage 件ずつに分けたときのページ数を返す。perPage を省略したら 10
//     例: pageCount(25) → 3
export function pageCount() {}

// 問4 「1,200円」の形にする。currency を省略したら「円」
//     例: priceText(1200, "ドル") → "1,200ドル"
export function priceText() {}

// 問5 char を times 個並べる。char を省略したら "*"、times を省略したら 3
//     例: stars() → "***"
export function stars() {}

// 問6 text を left と right で囲む。省略したら "[" と "]"
//     例: bracket("a") → "[a]"
export function bracket() {}

// 問7 value を min 以上 max 以下に収める。min を省略したら 0、max を省略したら 100
//     例: limit(150) → 100
export function limit() {}

// 問8 要素を separator でつなぐ。separator を省略したら ", "
//     例: joinItems(["a", "b"]) → "a, b"
export function joinItems() {}

// 問9 税込価格（1円未満は切り捨て）を返す。rate を省略したら 0.1
//     例: withTax(1000) → 1100
export function withTax() {}

// 問10 end 未満の数を、start から step ずつ増やした配列を返す。引数は rangeOf(end, start, step) の順で、start を省略したら 0、step を省略したら 1
//     例: rangeOf(3) → [0, 1, 2]
//     例: rangeOf(10, 2, 3) → [2, 5, 8]
export function rangeOf() {}

// 問11 「◯秒後」を返す。seconds を省略したら 1
//     例: afterText() → "1秒後"
export function afterText() {}

// 問12 { size, color } を返す。size を省略したら "M"、color を省略したら "black"
//     例: makeOptions() → { size: "M", color: "black" }
export function makeOptions() {}

// 問13 text を width 文字になるよう、前を fill で埋める。width を省略したら 5、fill を省略したら " "
//     例: padLeft("ab") → "   ab"
export function padLeft() {}

// 問14 「2026-01-01」の形にする（月と日は2桁）。month と day を省略したら 1
//     例: dateText(2026) → "2026-01-01"
export function dateText() {}

// 問15 max 文字を超えたら、max 文字に切って「…」を付ける。max を省略したら 5
//     例: shorten("TypeScript") → "TypeS…"
export function shorten() {}

// 問16 score が pass 以上なら "合格"、それ未満は "不合格"。pass を省略したら 60
//     例: passOrFail(70) → "合格"
export function passOrFail() {}

// 問17 part が total の何パーセントかを、整数に四捨五入して返す。total を省略したら 100
//     例: percentage(25, 200) → 13
export function percentage() {}

// 問18 「タイトル | サイト名」を返す。site を省略したら「Agora」
//     例: pageTitle("設定") → "設定 | Agora"
export function pageTitle() {}

// 問19 n × 1 から n × upTo までを並べた配列を返す。upTo を省略したら 9
//     例: timesTable(2, 3) → [2, 4, 6]
export function timesTable() {}

// 問20 text を separator で分けた配列を返す。separator を省略したら ","
//     例: splitBy("a,b,c") → ["a", "b", "c"]
export function splitBy() {}
