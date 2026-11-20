// 03-q07 as const ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/const-assertion
//
// 定義済みの定数 STATUSES、PRIORITY_POINTS、MONTH_NAMES などを使って関数を書く。引数と戻り値には型注釈を付けること。
// 型 Status、Priority の書き方（typeof、keyof）は07章で扱う。ここでは使うだけでよい。

export const STATUSES = ["todo", "doing", "done"] as const;

export type Status = (typeof STATUSES)[number];

// 問16 定数 STATUS_TEXT を { todo: "未着手", doing: "作業中", done: "完了" } として as const で宣言して export し、statusText(status: Status) を書く。戻り値の型注釈は書かない（"未着手" | "作業中" | "完了" に推論される）
//     例: statusText("doing") → "作業中"
// ここに STATUS_TEXT と関数 statusText を書く
