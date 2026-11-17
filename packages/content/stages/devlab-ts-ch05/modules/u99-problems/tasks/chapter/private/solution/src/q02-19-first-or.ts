// 05-q02 引数と戻り値の型、void ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/function-parameters
//       https://typescriptbook.jp/reference/functions/void-type
//       https://typescriptbook.jp/reference/functions/pass-by-value

// 問19
export function firstOr(items: readonly string[], fallback: string): string {
  return items[0] ?? fallback;
}
