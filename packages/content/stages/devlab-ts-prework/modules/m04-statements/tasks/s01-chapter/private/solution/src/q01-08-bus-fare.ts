// 04-q01 if-else文 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/if-else
//       https://typescriptbook.jp/reference/statements/ternary-operator

// 問8
export function busFare(age: number): number {
  if (age < 6) {
    return 0;
  }
  if (age <= 12) {
    return 120;
  }
  return 240;
}
