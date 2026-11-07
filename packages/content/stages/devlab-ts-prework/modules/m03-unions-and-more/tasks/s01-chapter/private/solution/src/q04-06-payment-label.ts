// 03-q04 判別可能なユニオン型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union

export type Payment =
  | { method: "cash" }
  | { method: "card"; cardNumber: string }
  | { method: "bank"; bankName: string };

// 問6
export function paymentLabel(payment: Payment): string {
  switch (payment.method) {
    case "cash":
      return "現金";
    case "card":
      return `カード（末尾${payment.cardNumber.slice(-4)}）`;
    case "bank":
      return `振込（${payment.bankName}）`;
  }
}
