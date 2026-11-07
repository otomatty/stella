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

// 問9 お知らせを表示する。info は「[情報] 本文」、warning は「[注意Lv2] 本文」、error は「[エラー500] 本文」
//     例: noticeText({ type: "info", message: "更新しました" }) → "[情報] 更新しました"
export function noticeText() {}
