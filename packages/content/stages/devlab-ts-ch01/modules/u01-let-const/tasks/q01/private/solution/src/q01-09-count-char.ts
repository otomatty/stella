// 問9 text の中に char が何回出てくるかを返す（for-of で1文字ずつ見る）
//     例: countChar("banana", "a") → 3
export function countChar(text: string, char: string): number {
  let count = 0;
  for (const c of text) {
    if (c === char) {
      count++;
    }
  }
  return count;
}
