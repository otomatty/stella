// 04-q01 if-else文 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/if-else
//       https://typescriptbook.jp/reference/statements/ternary-operator

// 問1
export function absValue(n: number): number {
  if (n < 0) {
    return -n;
  }
  return n;
}
