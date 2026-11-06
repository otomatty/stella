// 08-q01 Promise ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous
//       https://typescriptbook.jp/reference/asynchronous/promise
//
// 次の20問を、async と await を使わずに書いてください（async/await は q02 で扱う）。
// 使うのは new Promise、then・catch・finally、Promise.resolve・Promise.reject・Promise.all・Promise.race・Promise.allSettled です。
// 引数と戻り値には型注釈を付けること。戻り値の型は Promise<number> のように、Promise の中身の型まで書く。
// 失敗させるときは、文字列ではなく Error を使う（Promise.reject(new Error("…"))、throw new Error("…")）。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

// 問1 value ですぐに解決する Promise を返す（Promise.resolve）
//     例: resolveWith("a") → "a" で解決する Promise
export function resolveWith() {}

// 問2 message を持つ Error で失敗する Promise を返す（Promise.reject）。戻り値の型は Promise<never>
//     例: rejectWith("失敗") → Error("失敗") で失敗する Promise
export function rejectWith() {}

// 問3 ms ミリ秒たったら解決する Promise<void> を返す（new Promise と setTimeout）
//     例: wait(100) → 100ミリ秒後に解決する
export function wait() {}

// 問4 ms ミリ秒たったら value で解決する Promise を返す
//     例: waitValue("a", 50) → 50ミリ秒後に "a" で解決する
export function waitValue() {}

// 問5 then で、promise の値を2倍にした Promise を返す
//     例: double(Promise.resolve(3)) → 6 で解決する
export function double() {}

// 問6 then で、promise の文字列の文字数を返す
//     例: lengthOf(Promise.resolve("abc")) → 3 で解決する
export function lengthOf() {}

// 問7 then で、promise の文字列の前後の空白を取り除く
//     例: trimmed(Promise.resolve("  a ")) → "a" で解決する
export function trimmed() {}

// 問8 a の then の中で b の then を呼び、2つの値の合計を返す（Promise.all は使わない）
//     例: addBoth(Promise.resolve(1), Promise.resolve(2)) → 3 で解決する
export function addBoth() {}

// 問9 then の中で Number で数に変換する。数にならなければ（NaN なら）then の中で Error を投げる
//     例: parseNumber(Promise.resolve("12")) → 12 で解決する
//     例: parseNumber(Promise.resolve("abc")) → Error で失敗する
export function parseNumber() {}

// 問10 catch で、promise が失敗したら 0 で解決する Promise にする
//     例: recover(Promise.reject(new Error("x"))) → 0 で解決する
export function recover() {}

// 問11 成功なら "成功"、失敗の理由が Error ならその message、Error でなければ "不明なエラー" で解決する
//     例: errorMessage(Promise.reject(new Error("x"))) → "x" で解決する
export function errorMessage() {}

// 問12 finally で、成功しても失敗しても log に "done" を足す。結果は promise と同じにする
//     例: logDone(Promise.resolve(3), log) → 3 で解決し、log に "done" が足される
export function logDone() {}

// 問13 Promise.all で、すべての値の配列を返す
//     例: allNumbers([Promise.resolve(1), Promise.resolve(2)]) → [1, 2] で解決する
export function allNumbers() {}

// 問14 Promise.all と then で、すべての値の合計を返す。空なら 0
//     例: sumOfAll([Promise.resolve(1), Promise.resolve(2)]) → 3 で解決する
export function sumOfAll() {}

// 問15 Promise.all で、2つの値を [文字列, 数値] のタプルにして返す
//     例: pairOf(Promise.resolve("a"), Promise.resolve(1)) → ["a", 1] で解決する
export function pairOf() {}

// 問16 Promise.race で、いちばん早く解決した値を返す
//     例: fastest([遅い Promise, 速い Promise]) → 速いほうの値で解決する
export function fastest() {}

// 問17 Promise.allSettled で、成功した Promise の数を返す
//     例: settledCount([成功, 失敗, 成功]) → 2 で解決する
export function settledCount() {}

// 問18 Promise.allSettled で、成功した値だけの配列を返す（元の順）
//     例: fulfilledValues([1 で成功, 失敗, 3 で成功]) → [1, 3] で解決する
export function fulfilledValues() {}

// 問19 Promise.allSettled で、失敗の理由の message の配列を返す。理由が Error でなければ "不明なエラー"
//     例: rejectedMessages([成功, Error("x") で失敗]) → ["x"] で解決する
export function rejectedMessages() {}

// 問20 start から始めて、steps の関数を前から順に then でつなぎ、最後の値を返す
//     例: chainSteps(1, [n を1足す, n を2倍]) → 4 で解決する
export function chainSteps() {}
