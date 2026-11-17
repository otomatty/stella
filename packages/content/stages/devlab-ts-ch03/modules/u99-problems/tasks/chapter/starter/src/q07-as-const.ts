// 03-q07 as const
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/const-assertion
//
// 問題
// タスクのステータスを扱います。
//
// 1. STATUSES に as const を付けてください。
//    すると、その下の Status 型が "todo" | "doing" | "done" になる
//    （Status 型の書き方は07章で扱う。ここは書き換えない）
//
// 2. nextStatus(status) を書いてください
//    STATUSES の並びで1つ先のステータスを返す。最後の "done" は "done" のまま
//    STATUSES と indexOf を使い、"todo" などの文字列を関数の中に直接書かないこと
//
// 3. 定数 STATUS_LABELS を、as const を付けて宣言し export してください
//    todo は "未着手"、doing は "作業中"、done は "完了"
//
// 4. labelOf(status) を書いてください。STATUS_LABELS からステータスの表示名を返す
//    戻り値には型注釈を書かない（as const のおかげで、どんな型に推論されるかを確かめること）

export const STATUSES = ["todo", "doing", "done"];
export type Status = (typeof STATUSES)[number];

export function nextStatus() {}

// ここに STATUS_LABELS を宣言する

export function labelOf() {}
