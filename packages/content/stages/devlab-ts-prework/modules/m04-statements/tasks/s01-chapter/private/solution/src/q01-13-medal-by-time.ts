// 04-q01 if-else文 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/if-else
//       https://typescriptbook.jp/reference/statements/ternary-operator

// 問13
export function medalByTime(seconds: number): "金" | "銀" | "銅" | "参加賞" {
  if (seconds < 60) {
    return "金";
  }
  if (seconds < 90) {
    return "銀";
  }
  if (seconds < 120) {
    return "銅";
  }
  return "参加賞";
}
