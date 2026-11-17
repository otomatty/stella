// 03-q04 判別可能なユニオン型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union

export type Payment =
  | { method: "cash" }
  | { method: "card"; cardNumber: string }
  | { method: "bank"; bankName: string };

// 問7
export function needsConfirmation(payment: Payment): boolean {
  return payment.method !== "cash";
}
