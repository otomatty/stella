// 05-q03 オプション引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/optional-parameters

// 問20
export function initialsOf(first: string, last?: string): string {
  const head = first.slice(0, 1);
  return last === undefined ? head : `${head}.${last.slice(0, 1)}`;
}
