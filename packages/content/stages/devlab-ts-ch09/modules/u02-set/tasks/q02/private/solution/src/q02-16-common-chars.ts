// 09-q02 Set ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/set

// 問16
export function commonChars(a: string, b: string): string {
  const inB = new Set(b);
  return [...new Set(a)].filter((char) => inB.has(char)).join("");
}
