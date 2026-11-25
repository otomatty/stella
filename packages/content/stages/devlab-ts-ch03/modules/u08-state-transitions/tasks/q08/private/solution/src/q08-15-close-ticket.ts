// 問15 open か assigned のチケットを、resolution を付けて closed にする。closed ならそのまま
//     例: closeTicket({ status: "open", title: "バグ" }, "修正済み") → { status: "closed", title: "バグ", resolution: "修正済み" }
// 引数と戻り値に型注釈を付ける。
// 定義済みの Ticket 型を使い、status で状態を見分ける。
// 状態を変えるときは、元のオブジェクトを変更せず、新しいオブジェクトを返す。

export type Ticket =
  | { status: "open"; title: string }
  | { status: "assigned"; title: string; assignee: string }
  | { status: "closed"; title: string; resolution: string };

export function closeTicket(ticket: Ticket, resolution: string): Ticket {
  if (ticket.status === "closed") {
    return ticket;
  }
  return { status: "closed", title: ticket.title, resolution };
}
