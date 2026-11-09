// 09-q05 import と export ドリル
//
// 教材: https://typescriptbook.jp/reference/import-export-require

// 問5
function internalSquare(n: number): number {
  return n * n;
}

export { internalSquare as square };
