// 03-q04 判別可能なユニオン型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union
//
// 引数と戻り値には型注釈を付けること。
// 定義済みの型 Shape、Payment、Notice を使う。kind や method のような共通のプロパティで、どの形かを見分けてから使う。
// switch を使うときは、すべての場合の case を書く（ESLint の switch-exhaustiveness-check。switch は04章で詳しく扱う）。

export type Notice =
  | { type: "info"; message: string }
  | { type: "warning"; message: string; level: number }
  | { type: "error"; message: string; code: number };

// 問11 error なら code、それ以外は undefined を返す
//     例: errorCode({ type: "error", message: "x", code: 404 }) → 404
export function errorCode() {}
