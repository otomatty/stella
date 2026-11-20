// 04-q01 if-else文 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/if-else
//       https://typescriptbook.jp/reference/statements/ternary-operator

// 問9
export function discountRate(total: number): number {
  if (total >= 10000) {
    return 0.1;
  }
  if (total >= 5000) {
    return 0.05;
  }
  return 0;
}
