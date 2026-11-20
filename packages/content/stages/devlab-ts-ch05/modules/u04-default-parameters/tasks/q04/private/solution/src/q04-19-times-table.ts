// 05-q04 デフォルト引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/default-parameters

// 問19
export function timesTable(n: number, upTo = 9): number[] {
  const result: number[] = [];
  for (let i = 1; i <= upTo; i++) {
    result.push(n * i);
  }
  return result;
}
