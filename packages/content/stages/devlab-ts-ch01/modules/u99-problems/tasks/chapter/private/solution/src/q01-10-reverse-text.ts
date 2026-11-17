// 01-q01 letとconst ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/let-and-const
//       https://typescriptbook.jp/reference/values-types-variables/vars-problems

// 問10
export function reverseText(text: string): string {
  let result = "";
  for (const c of text) {
    result = c + result;
  }
  return result;
}
