// 03-q07 as const ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/const-assertion
//
// 定義済みの定数 STATUSES、PRIORITY_POINTS、MONTH_NAMES などを使って関数を書く。引数と戻り値には型注釈を付けること。
// 型 Status、Priority の書き方（typeof、keyof）は07章で扱う。ここでは使うだけでよい。

export const STATUSES = ["todo", "doing", "done"] as const;

export type Status = (typeof STATUSES)[number];

// 問19 ステータスの配列から、{ todo, doing, done } それぞれの数を数える
//     例: countByStatus(["todo", "done", "done"]) → { todo: 1, doing: 0, done: 2 }
export function countByStatus() {}
