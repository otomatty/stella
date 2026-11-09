// 05-q03 オプション引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/optional-parameters

// 問12
export function tagText(name: string, color?: string): string {
  return color === undefined ? `<${name}>` : `<${name}:${color}>`;
}
