// 05-q04 デフォルト引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/default-parameters

// 問8
export function joinItems(items: readonly string[], separator = ", "): string {
  return items.join(separator);
}
