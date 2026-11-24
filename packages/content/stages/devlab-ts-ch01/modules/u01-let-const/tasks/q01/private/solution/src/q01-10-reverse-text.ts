// 問10 文字列を逆順にして返す（for-of で1文字ずつ前に足していく）
//     例: reverseText("abc") → "cba"
export function reverseText(text: string): string {
  let result = "";
  for (const c of text) {
    result = c + result;
  }
  return result;
}
