// 08-q04 非同期のエラー処理
//
// 教材: https://typescriptbook.jp/reference/asynchronous/await
//       https://typescriptbook.jp/reference/statements/exception
//
// 問題
// 失敗するかもしれない非同期の処理（引数の fn や tasks）を扱う関数を書いてください。
// async と await、try・catch を使うこと。catch で受け取る値の型は unknown なので、Error かどうかを確かめてから使う。
// fn や tasks の要素は、呼ぶたびに新しく処理を始める関数です（呼んだ回数だけ処理が走る）。
//
// 1. tryAsync(fn)
//    fn() を待ち、成功なら { ok: true, value: 値 }、失敗なら { ok: false, error: Error } を返す（Result<T>）。
//    Error でないものが投げられたときは、String(値) を message にした Error にして入れる
//
// 2. withRetry(fn, attempts)
//    fn() が成功するまで、全部で attempts 回まで呼ぶ。成功したらその値を返す。
//    attempts 回とも失敗したら、最後の失敗をそのまま投げる。attempts が1未満なら Error を投げる
//
// 3. firstSuccessful(tasks)
//    tasks を前から順番に1つずつ呼び、最初に成功した値を返す（成功したら、後ろの task は呼ばない）。
//    すべて失敗したら（tasks が空のときも）"すべて失敗しました" の Error を投げる
//
// 4. runAll(tasks)
//    tasks を前から順番に1つずつ呼ぶ。失敗しても止めずに最後まで呼び、
//    { values: 成功した値の配列, errors: 失敗した Error の message の配列 } を返す（どちらも呼んだ順）。
//    Error でないものが投げられたときの message は "不明なエラー"
//
// 注意
// try の中で Promise を return するときは、return await と書く。
// await を付けないと、その Promise の失敗は catch で捕まえられない（ESLint の return-await もこれを確かめる）
//
// 説明すること（答えは、この下に // のコメントで書く）
// - withRetry で、try の中を return fn(); と書くと何が起きるか。試した結果を書く

export type Result<T> = { ok: true; value: T } | { ok: false; error: Error };

export function tryAsync() {}

export function withRetry() {}

export function firstSuccessful() {}

export function runAll() {}
