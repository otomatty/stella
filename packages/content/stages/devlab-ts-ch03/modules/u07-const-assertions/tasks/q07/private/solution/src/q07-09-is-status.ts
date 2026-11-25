// 問9 文字列が STATUSES のどれかなら true（STATUSES.some を使う。includes は引数の型が合わないので使えない）
//     例: isStatus("doing") → true
// 引数と戻り値に型注釈を付ける。

export const STATUSES = ["todo", "doing", "done"] as const;

export function isStatus(text: string): boolean {
  return STATUSES.some((status) => status === text);
}
