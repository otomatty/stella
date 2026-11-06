// 05-e01 発展問題 オーバーロード関数
//
// 教材: https://typescriptbook.jp/reference/functions/overload-functions
//
// 問題
// 引数の型によって戻り値の型が変わる関数は、オーバーロード（同じ名前の関数の型を複数並べる書き方）で表せます。
// 次の2つの関数を、オーバーロードで書いてください。
//
// 1. convert(value)
//    - 文字列を渡したら、数値にして返す（戻り値の型は number）
//    - 数値を渡したら、文字列にして返す（戻り値の型は string）
//    例: convert("42") → 42、convert(42) → "42"
//
// 2. pick(items, index?)
//    - index を渡したら、その番号の要素を返す（戻り値の型は string | undefined）
//    - index を省略したら、配列のコピーを返す（戻り値の型は string[]）
//    引数の配列は readonly string[]
//
// 書き方の例:
//   export function f(value: string): number;
//   export function f(value: number): string;
//   export function f(value: string | number): number | string { … }
//
// 説明すること（答えは、この下に // のコメントで書く）
// - オーバーロードを使わずに、戻り値の型を number | string にした場合と比べて、呼び出し側で何がうれしいか

export function convert() {}

export function pick() {}
