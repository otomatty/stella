// 03-q04 判別可能なユニオン型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union
//
// 引数と戻り値には型注釈を付けること。
// 定義済みの型 Shape、Payment、Notice を使う。kind や method のような共通のプロパティで、どの形かを見分けてから使う。
// switch を使うときは、すべての場合の case を書く（ESLint の switch-exhaustiveness-check。switch は04章で詳しく扱う）。

export type Payment =
  | { method: "cash" }
  | { method: "card"; cardNumber: string }
  | { method: "bank"; bankName: string };

// 問6 支払い方法を表示する。cash は「現金」、card は「カード（末尾1234）」、bank は「振込（◯◯銀行）」
//     例: paymentLabel({ method: "card", cardNumber: "4111111111111234" }) → "カード（末尾1234）"
export function paymentLabel() {}
