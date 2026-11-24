// 問11 型 Tag を、TAGS の要素の型として作る（as const がないので string になる）
// 定義済みの定数は書き換えません。
// 配列の要素の型は、型を手で書き写さず (typeof 配列)[number] で取り出します。

export const TAGS = ["new", "sale"];

export type Tag = (typeof TAGS)[number];
