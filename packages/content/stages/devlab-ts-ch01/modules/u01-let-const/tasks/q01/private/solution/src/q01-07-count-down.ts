// 問7 n から 1 まで数えて、最後に「発射」を付けた文字列を返す
//     例: countDown(3) → "3, 2, 1, 発射"
export function countDown(n: number): string {
  let text = "";
  for (let i = n; i >= 1; i--) {
    text += `${i}, `;
  }
  return `${text}発射`;
}
