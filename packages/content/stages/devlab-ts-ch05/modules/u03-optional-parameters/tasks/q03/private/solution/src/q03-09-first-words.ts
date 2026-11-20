// 05-q03 オプション引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/optional-parameters

// 問9
export function firstWords(text: string, count?: number): string {
  return text
    .split(" ")
    .slice(0, count ?? 1)
    .join(" ");
}
