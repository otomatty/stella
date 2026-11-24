// 問8 card ならカード番号の末尾4桁、それ以外は undefined を返す
//     例: lastFour({ method: "card", cardNumber: "4111111111111234" }) → "1234"
// 引数と戻り値に型注釈を付ける。
// 定義済みの Payment 型を使い、method で場合を分ける。

export type Payment =
  | { method: "cash" }
  | { method: "card"; cardNumber: string }
  | { method: "bank"; bankName: string };

export function lastFour() {}
