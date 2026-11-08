// 04-q01 if-else文 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/if-else
//       https://typescriptbook.jp/reference/statements/ternary-operator

// 問15
export function parkingFee(minutes: number): number {
  if (minutes <= 30) {
    return 0;
  }
  return Math.ceil(minutes / 30) * 200;
}
