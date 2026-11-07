// 05-q03 オプション引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/optional-parameters

// 問1
export function greetWithTitle(name: string, title?: string): string {
  return `${name}${title ?? "さん"}`;
}
