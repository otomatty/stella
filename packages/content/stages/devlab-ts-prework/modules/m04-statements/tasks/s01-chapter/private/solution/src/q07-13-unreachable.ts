// 04-q07 never型と網羅性のチェック ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/never

// 問13
export function unreachable(): never {
  throw new Error("ここには来ないはずです");
}
