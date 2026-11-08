// 03-q08 状態の切り替え ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union

export type Ticket =
  | { status: "open"; title: string }
  | { status: "assigned"; title: string; assignee: string }
  | { status: "closed"; title: string; resolution: string };

// 問15
export function closeTicket(ticket: Ticket, resolution: string): Ticket {
  if (ticket.status === "closed") {
    return ticket;
  }
  return { status: "closed", title: ticket.title, resolution };
}
