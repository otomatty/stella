// 問15 text に word が含まれていれば true を返す
//     例: contains("TypeScript", "Script") → true
export function contains(text: string, word: string): boolean {
  return text.includes(word);
}
