// 問10 error なら true。warning は level が 3 以上なら true。info は false
//     例: isSerious({ type: "warning", message: "x", level: 3 }) → true
// 引数と戻り値に型注釈を付ける。
// 定義済みの Notice 型を使い、type で場合を分ける。

export type Notice =
  | { type: "info"; message: string }
  | { type: "warning"; message: string; level: number }
  | { type: "error"; message: string; code: number };

export function isSerious() {}
