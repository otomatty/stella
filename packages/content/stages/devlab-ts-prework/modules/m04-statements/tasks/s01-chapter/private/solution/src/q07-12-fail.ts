// 04-q07 never型と網羅性のチェック ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/never

// 問12
export function fail(message: string): never {
  throw new Error(message);
}
