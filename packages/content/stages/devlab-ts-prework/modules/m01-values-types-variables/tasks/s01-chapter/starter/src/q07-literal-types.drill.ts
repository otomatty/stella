// 01-q07 リテラル型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/literal-types
//
// 次の20個の関数を書いてください。
// 引数と戻り値には型注釈を付けること。決まった値しか受け取らない・返さないところは、リテラル型を | でつないで書く。
// 例: function toggle(state: "on" | "off"): "on" | "off"
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

// 問1 "on" なら "off"、"off" なら "on" を返す
//     例: toggle("on") → "off"
export function toggle() {}

// 問2 正なら 1、負なら -1、0 なら 0 を返す（戻り値は -1 | 0 | 1）
//     例: signOf(-5) → -1
export function signOf() {}

// 問3 偶数なら "表"、奇数なら "裏" を返す
//     例: coinSide(4) → "表"
export function coinSide() {}

// 問4 曜日の番号（0が日曜、6が土曜）が土日なら "休日"、それ以外は "平日" を返す
//     例: dayType(0) → "休日"
export function dayType() {}

// 問5 信号の次の色を返す。"green" → "yellow" → "red" → "green"
//     例: nextLight("red") → "green"
export function nextLight() {}

// 問6 80点以上は "A"、60点以上は "B"、それ未満は "C" を返す
//     例: gradeOf(75) → "B"
export function gradeOf() {}

// 問7 ステータスコード 200、404、500 のどれかを受け取り、200 なら true を返す
//     例: isSuccess(404) → false
export function isSuccess() {}

// 問8 "S" なら "小"、"M" なら "中"、"L" なら "大" を返す
//     例: sizeLabel("M") → "中"
export function sizeLabel() {}

// 問9 反対の方角を返す。"north" と "south"、"east" と "west" が反対
//     例: opposite("east") → "west"
export function opposite() {}

// 問10 true なら "yes"、false なら "no" を返す
//     例: answerOf(true) → "yes"
export function answerOf() {}

// 問11 優先度 1、2、3 を受け取り、1 なら "高"、2 なら "中"、3 なら "低" を返す
//     例: priorityLabel(1) → "高"
export function priorityLabel() {}

// 問12 サイコロの目（1〜6）を受け取り、6 なら true を返す
//     例: rollAgain(6) → true
export function rollAgain() {}

// 問13 "left" なら x を1減らし、"right" なら1増やした値を返す
//     例: moveX(5, "left") → 4
export function moveX() {}

// 問14 "light" なら "ライトモード"、"dark" なら "ダークモード" を返す
//     例: modeLabel("dark") → "ダークモード"
export function modeLabel() {}

// 問15 true なら 1、false なら 0 を返す
//     例: bitOf(true) → 1
export function bitOf() {}

// 問16 月（1〜12）から季節を返す。3〜5月は "春"、6〜8月は "夏"、9〜11月は "秋"、それ以外は "冬"
//     例: seasonOf(4) → "春"
export function seasonOf() {}

// 問17 a が小さければ -1、等しければ 0、大きければ 1 を返す
//     例: compare(2, 5) → -1
export function compare() {}

// 問18 "GET" なら "取得"、"POST" なら "作成"、"DELETE" なら "削除" を返す
//     例: methodLabel("POST") → "作成"
export function methodLabel() {}

// 問19 在席ステータスから色を返す。"online" は "green"、"busy" は "red"、"offline" は "gray"
//     例: statusColor("busy") → "red"
export function statusColor() {}

// 問20 順位が 1 なら "金"、2 なら "銀"、3 なら "銅"、それ以外は "なし" を返す
//     例: medal(2) → "銀"
export function medal() {}
