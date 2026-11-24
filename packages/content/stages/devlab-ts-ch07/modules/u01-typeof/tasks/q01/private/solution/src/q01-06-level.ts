// 問6 型 Level を、LEVELS の要素の型として作る（1 | 2 | 3 になる）
// 定義済みの定数は書き換えません。
// 配列の要素の型は、型を手で書き写さず (typeof 配列)[number] で取り出します。

export const LEVELS = [1, 2, 3] as const;

export type Level = (typeof LEVELS)[number];
