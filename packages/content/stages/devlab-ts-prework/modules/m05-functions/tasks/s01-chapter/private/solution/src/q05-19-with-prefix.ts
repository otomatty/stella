// 05-q05 残余引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/rest-parameters

// 問19
export function withPrefix(prefix: string, ...items: string[]): string[] {
  return items.map((item) => `${prefix}${item}`);
}
