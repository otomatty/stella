// 問7 card か bank なら true（確認が要る）
//     例: needsConfirmation({ method: "cash" }) → false
// 引数と戻り値に型注釈を付ける。
// 定義済みの Payment 型を使い、method で場合を分ける。

export type Payment =
  | { method: "cash" }
  | { method: "card"; cardNumber: string }
  | { method: "bank"; bankName: string };

export function needsConfirmation(payment: Payment): boolean {
  return payment.method !== "cash";
}
