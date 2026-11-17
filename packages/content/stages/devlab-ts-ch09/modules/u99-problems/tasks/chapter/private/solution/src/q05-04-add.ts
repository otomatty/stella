// 09-q05 import と export ドリル
//
// 教材: https://typescriptbook.jp/reference/import-export-require

// 問4
function add(a: number, b: number): number {
  return a + b;
}

function sub(a: number, b: number): number {
  return a - b;
}

export { add, sub };
