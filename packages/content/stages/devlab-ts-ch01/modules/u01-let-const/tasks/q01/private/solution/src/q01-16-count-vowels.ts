// 問16 英字の文字列に含まれる母音（a, e, i, o, u）の数を返す
//     例: countVowels("education") → 5
export function countVowels(text: string): number {
  const vowels = "aeiou";
  let count = 0;
  for (const c of text) {
    if (vowels.includes(c)) {
      count++;
    }
  }
  return count;
}
