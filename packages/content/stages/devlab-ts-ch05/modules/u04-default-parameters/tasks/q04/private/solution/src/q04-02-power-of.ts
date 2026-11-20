// 05-q04 デフォルト引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/default-parameters

// 問2
export function powerOf(base: number, exponent = 2): number {
  return base ** exponent;
}
