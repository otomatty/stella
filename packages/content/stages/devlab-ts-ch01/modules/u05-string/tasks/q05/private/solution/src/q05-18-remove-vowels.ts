// 問18 英字の母音（a, e, i, o, u）を取り除く（replaceAll を5回使うか、正規表現 /[aeiou]/g と replace）
//     例: removeVowels("typescript") → "typscrpt"
// 戻り値には型注釈を付けてください。
export function removeVowels(text: string): string {
  return text.replace(/[aeiou]/g, "");
}
