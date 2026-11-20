// 05-q02 引数と戻り値の型、void ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/function-parameters
//       https://typescriptbook.jp/reference/functions/void-type
//       https://typescriptbook.jp/reference/functions/pass-by-value

// 問8
export function swapInPlace(items: string[], i: number, j: number): void {
  const a = items[i];
  const b = items[j];
  if (a === undefined || b === undefined) {
    throw new Error("範囲外です");
  }
  items[i] = b;
  items[j] = a;
}
