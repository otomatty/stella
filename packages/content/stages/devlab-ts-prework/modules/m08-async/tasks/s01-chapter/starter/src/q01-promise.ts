// 08-q01 Promise
//
// 教材: https://typescriptbook.jp/reference/asynchronous
//       https://typescriptbook.jp/reference/asynchronous/promise
//
// 問題
// 次の関数を書いてください。このファイルでは async と await を使わず、
// new Promise、then・catch・finally、Promise.all・Promise.race などで書くこと（async/await は q02 で扱う）。
// 型変数（07章）を使うものは、引数の Promise の中身の型に合わせて戻り値の型が変わるようにする。
//
// 1. delay(ms)
//    ms ミリ秒たったら解決する Promise<void> を返す（new Promise と setTimeout）
//
// 2. timeout(promise, ms)
//    promise が ms ミリ秒以内に解決したら、その値で解決する。
//    間に合わなければ "タイムアウトしました" の Error で失敗する（Promise.race）
//
// 3. withLoading(promise, setLoading)
//    最初に setLoading(true) を呼び、promise が成功しても失敗しても、終わったら setLoading(false) を呼ぶ。
//    戻り値は promise と同じ結果（成功ならその値、失敗ならその失敗）になる Promise
//
// 4. orDefault(promise, fallback)
//    promise が成功したらその値、失敗したら fallback で解決する Promise を返す
//
// 5. sumAll(promises)
//    数値の Promise の配列を受け取り、すべて解決したら合計で解決する Promise<number> を返す。
//    1つでも失敗したら、その失敗をそのまま返す

export function delay() {}

export function timeout() {}

export function withLoading() {}

export function orDefault() {}

export function sumAll() {}
