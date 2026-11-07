// 04-q05 例外処理 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/exception

// 問14
export function checkAge(age: number): void {
  if (age < 0 || age > 150) {
    throw new RangeError("年齢は0〜150にしてください");
  }
}
