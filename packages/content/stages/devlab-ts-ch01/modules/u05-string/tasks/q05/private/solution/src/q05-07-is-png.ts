// 01-q05 string型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/string

// 問7
export function isPng(fileName: string): boolean {
  return fileName.toLowerCase().endsWith(".png");
}
