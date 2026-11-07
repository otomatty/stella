// 04-q01 if-else文 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/if-else
//       https://typescriptbook.jp/reference/statements/ternary-operator

// 問10
export function greetingFor(hour: number): "おはよう" | "こんにちは" | "こんばんは" {
  if (hour >= 5 && hour <= 10) {
    return "おはよう";
  }
  if (hour >= 11 && hour <= 17) {
    return "こんにちは";
  }
  return "こんばんは";
}
