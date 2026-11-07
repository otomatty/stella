// 05-q03 オプション引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/optional-parameters

// 問5
export function countdownFrom(from: number, to?: number): number[] {
  const end = to ?? 1;
  const result: number[] = [];
  for (let i = from; i >= end; i--) {
    result.push(i);
  }
  return result;
}
