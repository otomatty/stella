// 04-q01 if-else文 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/if-else
//       https://typescriptbook.jp/reference/statements/ternary-operator

// 問4
export function bmiLabel(bmi: number): "やせ" | "普通" | "肥満" {
  if (bmi < 18.5) {
    return "やせ";
  }
  if (bmi < 25) {
    return "普通";
  }
  return "肥満";
}
