// 04-q01 if-else文 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/if-else
//       https://typescriptbook.jp/reference/statements/ternary-operator

// 問5
export function ageGroup(age: number): "子ども" | "大人" | "シニア" {
  if (age < 18) {
    return "子ども";
  }
  if (age < 65) {
    return "大人";
  }
  return "シニア";
}
