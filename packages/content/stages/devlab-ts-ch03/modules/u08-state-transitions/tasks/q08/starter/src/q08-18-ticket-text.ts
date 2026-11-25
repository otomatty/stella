// 問18 「[未対応] タイトル」「[担当: 山田] タイトル」「[完了: 修正済み] タイトル」を返す
//     例: ticketText({ status: "open", title: "バグ" }) → "[未対応] バグ"
// 引数と戻り値に型注釈を付ける。
// 定義済みの Ticket 型を使い、status で状態を見分ける。

export type Ticket =
  | { status: "open"; title: string }
  | { status: "assigned"; title: string; assignee: string }
  | { status: "closed"; title: string; resolution: string };

export function ticketText() {}
