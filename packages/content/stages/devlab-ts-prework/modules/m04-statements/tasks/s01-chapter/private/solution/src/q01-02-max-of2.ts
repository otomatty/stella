// 04-q01 if-else文 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/if-else
//       https://typescriptbook.jp/reference/statements/ternary-operator

// 問2
export function maxOf2(a: number, b: number): number {
  if (a >= b) {
    return a;
  }
  return b;
}
