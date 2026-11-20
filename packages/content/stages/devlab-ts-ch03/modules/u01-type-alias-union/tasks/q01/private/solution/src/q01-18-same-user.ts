// 03-q01 型エイリアスとユニオン型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/type-alias
//       https://typescriptbook.jp/reference/values-types-variables/union

// 問18
export type UserId = string | number;

export function sameUser(a: UserId, b: UserId): boolean {
  return String(a) === String(b);
}
