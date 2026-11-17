// 01-q02 型注釈 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/type-annotation

// 問9
export function greet(name: string, hour: number): string {
  if (hour < 12) {
    return `おはよう、${name}さん`;
  }
  return `こんにちは、${name}さん`;
}
