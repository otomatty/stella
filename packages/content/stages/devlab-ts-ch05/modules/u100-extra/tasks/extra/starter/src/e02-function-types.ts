// 05-e02 発展問題 関数の型と、関数の組み合わせ
//
// 教材: https://typescriptbook.jp/reference/functions/function-type-declaration
//
// 問題
// 1. 型 NumberFn を、「数値を1つ受け取って数値を返す関数」の型として定義して export してください
//    （type NumberFn = (x: number) => number）
//
// 2. compose(f, g) を書いてください
//    「x に f を当てはめ、その結果に g を当てはめる」関数（x => g(f(x))）を返す。引数も戻り値も NumberFn
//
// 3. pipe(...fns) を書いてください
//    渡された関数を前から順に当てはめる関数を返す。関数が1つもなければ、x をそのまま返す関数を返す
//    例: pipe((x) => x + 1, (x) => x * 10)(2) → 30
//
// 4. repeatFn(fn, times) を書いてください
//    fn を times 回当てはめる関数を返す
//    例: repeatFn((x) => x * 2, 3)(1) → 8

export type NumberFn = unknown;

export function compose() {}

export function pipe() {}

export function repeatFn() {}
