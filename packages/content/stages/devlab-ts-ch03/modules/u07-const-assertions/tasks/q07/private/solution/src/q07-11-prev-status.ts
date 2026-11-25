// 問11 STATUSES の1つ前のステータスを返す。"todo" は "todo" のまま
//     例: prevStatus("done") → "doing"
// 引数と戻り値に型注釈を付ける。
// 定義済みの STATUSES と Status を使う。

export const STATUSES = ["todo", "doing", "done"] as const;

export type Status = (typeof STATUSES)[number];

export function prevStatus(status: Status): Status {
  return STATUSES[STATUSES.indexOf(status) - 1] ?? status;
}
