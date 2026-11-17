// 04-q05 例外処理 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/exception

// 問2
export function divide(a: number, b: number): number {
  if (b === 0) {
    throw new Error("0で割ることはできません");
  }
  return a / b;
}
