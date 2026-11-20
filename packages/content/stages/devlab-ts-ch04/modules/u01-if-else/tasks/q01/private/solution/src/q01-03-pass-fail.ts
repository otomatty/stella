// 04-q01 if-else文 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/if-else
//       https://typescriptbook.jp/reference/statements/ternary-operator

// 問3
export function passFail(score: number): "合格" | "不合格" {
  return score >= 60 ? "合格" : "不合格";
}
