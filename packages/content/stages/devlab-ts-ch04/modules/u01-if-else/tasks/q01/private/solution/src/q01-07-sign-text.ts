// 04-q01 if-else文 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/if-else
//       https://typescriptbook.jp/reference/statements/ternary-operator

// 問7
export function signText(n: number): "正" | "負" | "ゼロ" {
  if (n > 0) {
    return "正";
  }
  if (n < 0) {
    return "負";
  }
  return "ゼロ";
}
