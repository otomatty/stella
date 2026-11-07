// 03-q08 状態の切り替え ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union

export type Ticket =
  | { status: "open"; title: string }
  | { status: "assigned"; title: string; assignee: string }
  | { status: "closed"; title: string; resolution: string };

// 問18
export function ticketText(ticket: Ticket): string {
  switch (ticket.status) {
    case "open":
      return `[未対応] ${ticket.title}`;
    case "assigned":
      return `[担当: ${ticket.assignee}] ${ticket.title}`;
    case "closed":
      return `[完了: ${ticket.resolution}] ${ticket.title}`;
  }
}
