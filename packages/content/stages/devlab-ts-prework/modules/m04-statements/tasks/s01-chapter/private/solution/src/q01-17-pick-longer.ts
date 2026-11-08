// 04-q01 if-else文 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/if-else
//       https://typescriptbook.jp/reference/statements/ternary-operator

// 問17
export function pickLonger(a: string, b: string): string {
  return b.length > a.length ? b : a;
}
