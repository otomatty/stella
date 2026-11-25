// 問16 定数 STATUS_TEXT を { todo: "未着手", doing: "作業中", done: "完了" } として as const で宣言して export し、statusText(status: Status) を書く。戻り値の型注釈は書かない（"未着手" | "作業中" | "完了" に推論される）
//     例: statusText("doing") → "作業中"
// 定義済みの Status 型を使う。

export const STATUSES = ["todo", "doing", "done"] as const;

export type Status = (typeof STATUSES)[number];

// ここに STATUS_TEXT と関数 statusText を書く
