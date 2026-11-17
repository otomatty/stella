// 03-q07 as const ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/const-assertion
//
// 定義済みの定数 STATUSES、PRIORITY_POINTS、MONTH_NAMES などを使って関数を書く。引数と戻り値には型注釈を付けること。
// 型 Status、Priority の書き方（typeof、keyof）は07章で扱う。ここでは使うだけでよい。

export const STATUSES = ["todo", "doing", "done"] as const;

// 問9 文字列が STATUSES のどれかなら true（STATUSES.some を使う。includes は引数の型が合わないので使えない）
//     例: isStatus("doing") → true
export function isStatus() {}
