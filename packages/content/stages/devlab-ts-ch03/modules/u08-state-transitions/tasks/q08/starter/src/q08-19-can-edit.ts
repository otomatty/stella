// 問19 closed でなければ true
//     例: canEdit({ status: "open", title: "バグ" }) → true
// 引数と戻り値に型注釈を付ける。
// 定義済みの Ticket 型を使い、status で状態を見分ける。

export type Ticket =
  | { status: "open"; title: string }
  | { status: "assigned"; title: string; assignee: string }
  | { status: "closed"; title: string; resolution: string };

export function canEdit() {}
