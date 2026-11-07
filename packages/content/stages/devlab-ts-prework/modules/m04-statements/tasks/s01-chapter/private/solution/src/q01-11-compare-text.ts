// 04-q01 if-else文 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/if-else
//       https://typescriptbook.jp/reference/statements/ternary-operator

// 問11
export function compareText(a: number, b: number): string {
  if (a > b) {
    return "a のほうが大きい";
  }
  if (a < b) {
    return "b のほうが大きい";
  }
  return "同じ";
}
