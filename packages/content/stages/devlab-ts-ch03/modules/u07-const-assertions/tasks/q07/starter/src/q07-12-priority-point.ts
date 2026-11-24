// 問12 PRIORITY_POINTS から点数を返す
//     例: priorityPoint("high") → 3
// 引数と戻り値に型注釈を付ける。
// 定義済みの PRIORITY_POINTS と Priority を使う。

export const PRIORITY_POINTS = { high: 3, middle: 2, low: 1 } as const;

export type Priority = keyof typeof PRIORITY_POINTS;

export function priorityPoint() {}
