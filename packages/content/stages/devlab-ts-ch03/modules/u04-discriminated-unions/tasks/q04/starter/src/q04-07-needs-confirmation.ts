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

// 問7 card か bank なら true（確認が要る）
//     例: needsConfirmation({ method: "cash" }) → false
export function needsConfirmation() {}
