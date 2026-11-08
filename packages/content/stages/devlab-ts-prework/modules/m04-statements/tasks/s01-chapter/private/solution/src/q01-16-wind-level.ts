// 04-q01 if-else文 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/if-else
//       https://typescriptbook.jp/reference/statements/ternary-operator

// 問16
export function windLevel(speed: number): "弱い" | "やや強い" | "強い" {
  if (speed < 5) {
    return "弱い";
  }
  if (speed < 10) {
    return "やや強い";
  }
  return "強い";
}
