// 03-q01 型エイリアスとユニオン型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/type-alias
//       https://typescriptbook.jp/reference/values-types-variables/union

// 問10
export type Score = number | "欠席";

export function scoreText(score: Score): string {
  return score === "欠席" ? score : `${score}点`;
}
