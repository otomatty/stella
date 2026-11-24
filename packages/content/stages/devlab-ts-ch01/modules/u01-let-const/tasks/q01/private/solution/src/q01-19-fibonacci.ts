// 問19 フィボナッチ数列の n 番目を返す（0番目は0、1番目は1、それ以降は前の2つの和）
//     例: fibonacci(10) → 55
export function fibonacci(n: number): number {
  let prev = 0;
  let current = 1;
  for (let i = 0; i < n; i++) {
    const next = prev + current;
    prev = current;
    current = next;
  }
  return prev;
}
