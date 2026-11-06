// 03-q07 as const ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/const-assertion
//
// 次の20問を解いてください。
// 問1〜8 は、定数を as const を付けて宣言し export する。テストは、値に加えて、推論される型（readonly とリテラル型）も確かめる。
// 問9〜20 は、定義済みの定数 STATUSES、PRIORITY_POINTS、MONTH_NAMES などを使って関数を書く。引数と戻り値には型注釈を付けること。
// 型 Status、Priority の書き方（typeof、keyof）は07章で扱う。ここでは使うだけでよい。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

export const STATUSES = ["todo", "doing", "done"] as const;
export type Status = (typeof STATUSES)[number];

export const PRIORITY_POINTS = { high: 3, middle: 2, low: 1 } as const;
export type Priority = keyof typeof PRIORITY_POINTS;

export const MONTH_NAMES = [
  "1月",
  "2月",
  "3月",
  "4月",
  "5月",
  "6月",
  "7月",
  "8月",
  "9月",
  "10月",
  "11月",
  "12月",
] as const;

// 問1 定数 DAYS を ["月", "火", "水"] として宣言する。型は readonly ["月", "火", "水"]
// ここに DAYS を宣言する

// 問2 定数 ORIGIN を { x: 0, y: 0 } として宣言する。型は { readonly x: 0; readonly y: 0 }
// ここに ORIGIN を宣言する

// 問3 定数 ROLES を ["admin", "editor", "viewer"] として宣言する
// ここに ROLES を宣言する

// 問4 定数 HTTP_STATUS を { ok: 200, notFound: 404 } として宣言する
// ここに HTTP_STATUS を宣言する

// 問5 定数 LEVELS を [1, 2, 3] として宣言する
// ここに LEVELS を宣言する

// 問6 定数 THEME を { primary: "#0066ff", radius: 4 } として宣言する
// ここに THEME を宣言する

// 問7 定数 FLAGS を { beta: true, debug: false } として宣言する
// ここに FLAGS を宣言する

// 問8 定数 ENTRY を ["key", 1] として宣言する。型は readonly ["key", 1]
// ここに ENTRY を宣言する

// 問9 文字列が STATUSES のどれかなら true（STATUSES.some を使う。includes は引数の型が合わないので使えない）
//     例: isStatus("doing") → true
export function isStatus() {}

// 問10 STATUSES の何番目（0から数える）かを返す
//     例: statusIndex("done") → 2
export function statusIndex() {}

// 問11 STATUSES の1つ前のステータスを返す。"todo" は "todo" のまま
//     例: prevStatus("done") → "doing"
export function prevStatus() {}

// 問12 PRIORITY_POINTS から点数を返す
//     例: priorityPoint("high") → 3
export function priorityPoint() {}

// 問13 点数の高い方の優先度を返す。同じなら a
//     例: higherPriority("low", "middle") → "middle"
export function higherPriority() {}

// 問14 月（1〜12）から MONTH_NAMES の名前を返す。範囲外なら Error を投げる
//     例: monthName(4) → "4月"
export function monthName() {}

// 問15 STATUSES をコピーした、書き換えられる配列を返す
//     例: allStatuses() → ["todo", "doing", "done"]
export function allStatuses() {}

// 問16 定数 STATUS_TEXT を { todo: "未着手", doing: "作業中", done: "完了" } として as const で宣言して export し、statusText(status: Status) を書く。戻り値の型注釈は書かない（"未着手" | "作業中" | "完了" に推論される）
//     例: statusText("doing") → "作業中"
// ここに STATUS_TEXT と関数 statusText を書く

// 問17 定数 SIZE_PX を { S: 12, M: 16, L: 20 } として as const で宣言して export し、sizePx(size: "S" | "M" | "L") を書く
//     例: sizePx("L") → 20
// ここに SIZE_PX と関数 sizePx を書く

// 問18 定数 WEEKEND を ["土", "日"] として as const で宣言して export し、isWeekendDay(day: string) を書く。WEEKEND のどれかなら true
//     例: isWeekendDay("日") → true
// ここに WEEKEND と関数 isWeekendDay を書く

// 問19 ステータスの配列から、{ todo, doing, done } それぞれの数を数える
//     例: countByStatus(["todo", "done", "done"]) → { todo: 1, doing: 0, done: 2 }
export function countByStatus() {}

// 問20 月（1〜12）の次の月の名前を MONTH_NAMES から返す。12月の次は「1月」。範囲外なら Error を投げる
//     例: nextMonthName(12) → "1月"
export function nextMonthName() {}
