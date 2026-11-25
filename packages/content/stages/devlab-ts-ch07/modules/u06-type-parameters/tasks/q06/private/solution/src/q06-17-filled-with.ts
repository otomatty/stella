// 問17 value を length 個並べた新しい配列
//     例: filledWith(3, 0) → [0, 0, 0]
// 型変数を使い、unknown で型を置き換えないでください。

export function filledWith<T>(length: number, value: T): T[] {
  return Array.from({ length }, () => value);
}
