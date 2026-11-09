// 05-q03 オプション引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/optional-parameters

// 問10
export function makeUser(name: string, age?: number): { name: string; age?: number } {
  return age === undefined ? { name } : { name, age };
}
