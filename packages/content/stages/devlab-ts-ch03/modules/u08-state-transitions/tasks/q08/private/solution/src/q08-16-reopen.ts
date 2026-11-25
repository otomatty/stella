// 問16 closed のチケットを open に戻す。それ以外はそのまま
//     例: reopen({ status: "closed", title: "バグ", resolution: "修正" }) → { status: "open", title: "バグ" }
// 引数と戻り値に型注釈を付ける。
// 定義済みの Ticket 型を使い、status で状態を見分ける。
// 状態を変えるときは、元のオブジェクトを変更せず、新しいオブジェクトを返す。

export type Ticket =
  | { status: "open"; title: string }
  | { status: "assigned"; title: string; assignee: string }
  | { status: "closed"; title: string; resolution: string };

export function reopen(ticket: Ticket): Ticket {
  return ticket.status === "closed" ? { status: "open", title: ticket.title } : ticket;
}
