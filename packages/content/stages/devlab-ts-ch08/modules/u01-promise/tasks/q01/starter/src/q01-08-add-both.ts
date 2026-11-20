// 08-q01 Promise ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous
//       https://typescriptbook.jp/reference/asynchronous/promise
//
// async と await を使わずに書いてください（async/await は q02 で扱う）。
// 使うのは new Promise、then・catch・finally、Promise.resolve・Promise.reject・Promise.all・Promise.race・Promise.allSettled です。
// 引数と戻り値には型注釈を付けること。戻り値の型は Promise<number> のように、Promise の中身の型まで書く。
// 失敗させるときは、文字列ではなく Error を使う（Promise.reject(new Error("…"))、throw new Error("…")）。

// 問8 a の then の中で b の then を呼び、2つの値の合計を返す（Promise.all は使わない）
//     例: addBoth(Promise.resolve(1), Promise.resolve(2)) → 3 で解決する
export function addBoth() {}
