// 問18 型 UserId（文字列か数値）を定義して export し、sameUser(a: UserId, b: UserId) を書く。文字列にしたときに同じなら true
//     例: sameUser(1, "1") → true
// 引数と戻り値に型注釈を付ける。

export type UserId = string | number;

export function sameUser(a: UserId, b: UserId): boolean {
  return String(a) === String(b);
}
