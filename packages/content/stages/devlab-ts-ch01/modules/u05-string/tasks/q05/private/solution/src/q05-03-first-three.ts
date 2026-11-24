// 問3 最初の3文字を返す
//     例: firstThree("TypeScript") → "Typ"
// 戻り値には型注釈を付けてください。
// slice が使えます。
export function firstThree(text: string): string {
  return text.slice(0, 3);
}
