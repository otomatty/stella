// 04-q01 if-else文 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/if-else
//       https://typescriptbook.jp/reference/statements/ternary-operator

// 問18
export function parityLabel(n: number): "偶数" | "奇数" {
  return n % 2 === 0 ? "偶数" : "奇数";
}
