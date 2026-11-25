// 問6 支払い方法を表示する。cash は「現金」、card は「カード（末尾1234）」、bank は「振込（◯◯銀行）」
//     例: paymentLabel({ method: "card", cardNumber: "4111111111111234" }) → "カード（末尾1234）"
// 引数と戻り値に型注釈を付ける。
// 定義済みの Payment 型を使い、method で場合を分ける。

export type Payment =
  | { method: "cash" }
  | { method: "card"; cardNumber: string }
  | { method: "bank"; bankName: string };

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
