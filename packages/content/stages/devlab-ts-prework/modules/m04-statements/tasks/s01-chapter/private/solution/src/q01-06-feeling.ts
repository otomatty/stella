// 04-q01 if-else文 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/if-else
//       https://typescriptbook.jp/reference/statements/ternary-operator

// 問6
export function feeling(celsius: number): "寒い" | "ちょうどよい" | "暑い" {
  if (celsius < 15) {
    return "寒い";
  }
  if (celsius >= 28) {
    return "暑い";
  }
  return "ちょうどよい";
}
