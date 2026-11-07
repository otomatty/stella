// 05-q04 デフォルト引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/default-parameters

// 問16
export function passOrFail(score: number, pass = 60): "合格" | "不合格" {
  return score >= pass ? "合格" : "不合格";
}
