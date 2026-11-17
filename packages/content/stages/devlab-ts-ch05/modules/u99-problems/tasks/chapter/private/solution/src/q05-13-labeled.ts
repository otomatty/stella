// 05-q05 残余引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/rest-parameters

// 問13
export function labeled(label: string, ...items: string[]): string {
  return items.length === 0 ? `[${label}]` : `[${label}] ${items.join(", ")}`;
}
