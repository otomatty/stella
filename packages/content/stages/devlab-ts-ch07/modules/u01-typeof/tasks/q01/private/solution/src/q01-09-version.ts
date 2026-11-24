// 問9 型 Version を VERSION から作る（const で宣言した文字列なので、リテラル型 "1.2.3" になる）
// 定義済みの定数は書き換えません。
// 型は手で書き写さず、typeof で作ります。

export const VERSION = "1.2.3";

export type Version = typeof VERSION;
