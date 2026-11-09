// 04-q05 例外処理 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/exception

// 問1
export function requirePositive(n: number): number {
  if (n <= 0) {
    throw new Error("正の数が必要です");
  }
  return n;
}
