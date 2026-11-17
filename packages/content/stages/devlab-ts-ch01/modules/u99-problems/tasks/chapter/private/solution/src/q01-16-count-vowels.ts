// 01-q01 letとconst ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/let-and-const
//       https://typescriptbook.jp/reference/values-types-variables/vars-problems

// 問16
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
