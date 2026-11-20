// 05-q03 オプション引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/optional-parameters

// 問6
export function cut(text: string, max?: number): string {
  const limit = max ?? 10;
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
}
