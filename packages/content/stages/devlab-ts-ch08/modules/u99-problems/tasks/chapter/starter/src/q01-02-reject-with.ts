// 08-q01 Promise ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous
//       https://typescriptbook.jp/reference/asynchronous/promise
//
// async と await を使わずに書いてください（async/await は q02 で扱う）。
// 使うのは new Promise、then・catch・finally、Promise.resolve・Promise.reject・Promise.all・Promise.race・Promise.allSettled です。
// 引数と戻り値には型注釈を付けること。戻り値の型は Promise<number> のように、Promise の中身の型まで書く。
// 失敗させるときは、文字列ではなく Error を使う（Promise.reject(new Error("…"))、throw new Error("…")）。

// 問2 message を持つ Error で失敗する Promise を返す（Promise.reject）。戻り値の型は Promise<never>
//     例: rejectWith("失敗") → Error("失敗") で失敗する Promise
export function rejectWith() {}
