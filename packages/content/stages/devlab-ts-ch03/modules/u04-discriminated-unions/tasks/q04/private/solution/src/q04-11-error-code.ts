// 問11 error なら code、それ以外は undefined を返す
//     例: errorCode({ type: "error", message: "x", code: 404 }) → 404
// 引数と戻り値に型注釈を付ける。
// 定義済みの Notice 型を使い、type で場合を分ける。

export type Notice =
  | { type: "info"; message: string }
  | { type: "warning"; message: string; level: number }
  | { type: "error"; message: string; code: number };

export function errorCode(notice: Notice): number | undefined {
  return notice.type === "error" ? notice.code : undefined;
}
