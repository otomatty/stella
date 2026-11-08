// 05-q03 オプション引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/optional-parameters

// 問16
export function ageLabel(age?: number): string {
  return age === undefined ? "年齢不明" : `${age}歳`;
}
