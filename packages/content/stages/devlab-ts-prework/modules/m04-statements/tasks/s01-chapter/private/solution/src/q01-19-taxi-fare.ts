// 04-q01 if-else文 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/if-else
//       https://typescriptbook.jp/reference/statements/ternary-operator

// 問19
export function taxiFare(fare: number, hour: number): number {
  if (hour >= 22 || hour < 5) {
    return Math.round(fare * 1.2);
  }
  return fare;
}
