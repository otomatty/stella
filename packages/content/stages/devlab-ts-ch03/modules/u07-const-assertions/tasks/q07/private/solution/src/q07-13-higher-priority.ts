// 問13 点数の高い方の優先度を返す。同じなら a
//     例: higherPriority("low", "middle") → "middle"
// 引数と戻り値に型注釈を付ける。
// 定義済みの PRIORITY_POINTS と Priority を使う。

export const PRIORITY_POINTS = { high: 3, middle: 2, low: 1 } as const;

export type Priority = keyof typeof PRIORITY_POINTS;

export function higherPriority(a: Priority, b: Priority): Priority {
  return PRIORITY_POINTS[b] > PRIORITY_POINTS[a] ? b : a;
}
