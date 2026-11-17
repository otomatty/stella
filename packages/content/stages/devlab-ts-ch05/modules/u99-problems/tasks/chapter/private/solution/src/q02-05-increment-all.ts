// 05-q02 引数と戻り値の型、void ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/function-parameters
//       https://typescriptbook.jp/reference/functions/void-type
//       https://typescriptbook.jp/reference/functions/pass-by-value

// 問5
export function incrementAll(counts: number[]): void {
  for (let i = 0; i < counts.length; i++) {
    counts[i] = (counts[i] ?? 0) + 1;
  }
}
