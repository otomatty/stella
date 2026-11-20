// 08-q01 Promise ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous
//       https://typescriptbook.jp/reference/asynchronous/promise
//
// async と await を使わずに書いてください（async/await は q02 で扱う）。
// 使うのは new Promise、then・catch・finally、Promise.resolve・Promise.reject・Promise.all・Promise.race・Promise.allSettled です。
// 引数と戻り値には型注釈を付けること。戻り値の型は Promise<number> のように、Promise の中身の型まで書く。
// 失敗させるときは、文字列ではなく Error を使う（Promise.reject(new Error("…"))、throw new Error("…")）。

// 問12 finally で、成功しても失敗しても log に "done" を足す。結果は promise と同じにする
//     例: logDone(Promise.resolve(3), log) → 3 で解決し、log に "done" が足される
export function logDone() {}
