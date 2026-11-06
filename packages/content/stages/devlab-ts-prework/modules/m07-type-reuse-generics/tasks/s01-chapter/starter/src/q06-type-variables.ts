// 07-q06 型変数（ジェネリクス）
//
// 教材: https://typescriptbook.jp/reference/generics
//       https://typescriptbook.jp/reference/generics/type-variables
//
// 問題
// function first<T>(items: readonly T[]): T | undefined のように、型を引数のように受け取る（型変数 T）と、
// どんな型の配列にも使え、しかも戻り値の型が「渡した配列の要素の型」になる関数を書けます。
// 次の関数と型を、型変数を使って書いてください。any や unknown で逃げないこと。
//
// 1. first(items)   最初の要素を返す。空なら undefined
// 2. last(items)    最後の要素を返す。空なら undefined
// 3. repeat(value, times)  value を times 個並べた配列を返す
// 4. pair(a, b)     [a, b] のタプルを返す。a と b は別々の型でよい（型変数を2つ使う）
// 5. 型 Box<T>（{ value: T }）を定義して export し、box(value) で Box を作り、unbox(box) で中の値を返す
//
// どの関数も、テストは「数値の配列なら number、文字列の配列なら string」のように、
// 渡した型に合わせて戻り値の型が変わるかを確かめます

export function first() {}

export function last() {}

export function repeat() {}

export function pair() {}

export type Box = unknown;

export function box() {}

export function unbox() {}
