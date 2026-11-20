// 03-q08 状態の切り替え ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union

export type Ticket =
  | { status: "open"; title: string }
  | { status: "assigned"; title: string; assignee: string }
  | { status: "closed"; title: string; resolution: string };

// 問16
export function reopen(ticket: Ticket): Ticket {
  return ticket.status === "closed" ? { status: "open", title: ticket.title } : ticket;
}
