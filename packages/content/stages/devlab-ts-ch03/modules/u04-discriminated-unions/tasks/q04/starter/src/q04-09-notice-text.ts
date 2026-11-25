// 問9 お知らせを表示する。info は「[情報] 本文」、warning は「[注意Lv2] 本文」、error は「[エラー500] 本文」
//     例: noticeText({ type: "info", message: "更新しました" }) → "[情報] 更新しました"
// 引数と戻り値に型注釈を付ける。
// 定義済みの Notice 型を使い、type で場合を分ける。

export type Notice =
  | { type: "info"; message: string }
  | { type: "warning"; message: string; level: number }
  | { type: "error"; message: string; code: number };

export function noticeText() {}
