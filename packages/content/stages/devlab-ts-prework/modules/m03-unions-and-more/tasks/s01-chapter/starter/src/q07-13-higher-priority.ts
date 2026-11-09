// 03-q07 as const ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/const-assertion
//
// 定義済みの定数 STATUSES、PRIORITY_POINTS、MONTH_NAMES などを使って関数を書く。引数と戻り値には型注釈を付けること。
// 型 Status、Priority の書き方（typeof、keyof）は07章で扱う。ここでは使うだけでよい。

export const PRIORITY_POINTS = { high: 3, middle: 2, low: 1 } as const;

export type Priority = keyof typeof PRIORITY_POINTS;

// 問13 点数の高い方の優先度を返す。同じなら a
//     例: higherPriority("low", "middle") → "middle"
export function higherPriority() {}
