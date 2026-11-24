// 問14 open か assigned のチケットを、assignee の担当にする（assigned にする）。closed ならそのまま
//     例: assignTicket({ status: "open", title: "バグ" }, "山田") → { status: "assigned", title: "バグ", assignee: "山田" }
// 引数と戻り値に型注釈を付ける。
// 定義済みの Ticket 型を使い、status で状態を見分ける。
// 状態を変えるときは、元のオブジェクトを変更せず、新しいオブジェクトを返す。

export type Ticket =
  | { status: "open"; title: string }
  | { status: "assigned"; title: string; assignee: string }
  | { status: "closed"; title: string; resolution: string };

export function assignTicket(ticket: Ticket, assignee: string): Ticket {
  if (ticket.status === "closed") {
    return ticket;
  }
  return { status: "assigned", title: ticket.title, assignee };
}
