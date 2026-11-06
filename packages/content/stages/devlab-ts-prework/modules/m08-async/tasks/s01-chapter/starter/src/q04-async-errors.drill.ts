// 08-q04 非同期のエラー処理 ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous/await
//       https://typescriptbook.jp/reference/statements/exception
//
// 次の20問を、async・await と try・catch・finally を使って書いてください。型 Task・Result・ApiResult と関数 wait は定義済みです。
// Task は「呼ぶたびに処理を始め、数値で解決するか失敗する関数」です。呼んだ回数だけ処理が走ります。
// catch で受け取る値の型は unknown です。message を使うときは、error instanceof Error で確かめてから使う。
// try の中で Promise を return するときは return await と書く（await がないと、その失敗は catch で捕まえられない）。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

export type Task = () => Promise<number>;
export type Result = { ok: true; value: number } | { ok: false; message: string };
export type ApiResult = { ok: boolean; status: number };

// ms ミリ秒待つ
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// 問1 task を待ち、成功ならその値、失敗なら undefined を返す
//     例: safeRun(失敗する task) → undefined で解決する
export function safeRun() {}

// 問2 task を待ち、成功ならその値、失敗なら fallback を返す
//     例: runOr(失敗する task, 0) → 0 で解決する
export function runOr() {}

// 問3 成功なら "OK"、Error で失敗したらその message、Error でないもので失敗したら "不明なエラー" を返す
//     例: errorText(Error("通信エラー") で失敗する task) → "通信エラー" で解決する
export function errorText() {}

// 問4 成功なら { ok: true, value }、失敗なら { ok: false, message } を返す（Result）。Error でなければ message は "不明なエラー"
//     例: toResult(5 で成功する task) → { ok: true, value: 5 } で解決する
export function toResult() {}

// 問5 失敗したら `${context}: ${元の message}` の Error を投げ直す。元の失敗は { cause: error } で新しい Error に持たせる
//     例: withContext(Error("x") で失敗する task, "保存") → Error("保存: x") で失敗する
export function withContext() {}

// 問6 task を呼び、失敗したら1回だけやり直す。やり直しも失敗したら、その失敗を投げる
//     例: retryOnce(1回目だけ失敗する task) → 2回目の値で解決する
export function retryOnce() {}

// 問7 成功するまで、全部で attempts 回まで task を呼ぶ。attempts 回とも失敗したら、最後の失敗を投げる
//     例: retry(2回失敗する task, 3) → 3回目の値で解決する
export function retry() {}

// 問8 成功するまで、全部で max 回まで task を呼び、成功までに呼んだ回数を返す。max 回とも失敗したら、最後の失敗を投げる
//     例: attemptsNeeded(2回失敗する task, 5) → 3 で解決する
export function attemptsNeeded() {}

// 問9 tasks を前から順番に試し、最初に成功した値を返す（成功したら後ろは呼ばない）。全部失敗したら "すべて失敗しました" の Error
//     例: firstSuccess([失敗する task, 7 で成功する task]) → 7 で解決する
export function firstSuccess() {}

// 問10 tasks をすべて同時に呼び（Promise.allSettled）、失敗した数を返す
//     例: countFailures([成功, 失敗, 失敗]) → 2 で解決する
export function countFailures() {}

// 問11 task の結果を返す。成功しても失敗しても、最後に cleanup() を呼ぶ（finally）
//     例: withCleanup(task, cleanup) → task の結果。cleanup は必ず1回呼ばれる
export function withCleanup() {}

// 問12 task が ms ミリ秒以内に終われば、その値を返す。間に合わなければ "タイムアウトしました" の Error を投げる
//     例: withTimeout(200ミリ秒かかる task, 100) → Error("タイムアウトしました") で失敗する
export function withTimeout() {}

// 問13 task（文字列で解決する）を待ち、0 以上の整数に変換して返す。そうでなければ `年齢が正しくありません: 文字列` の Error を投げる
//     例: parseAge(() => Promise.resolve("20")) → 20 で解決する
export function parseAge() {}

// 問14 task（ApiResult で解決する）を待ち、ok なら status を返す。ok でなければ `HTTP 500` の形の Error を投げる
//     例: assertOk(() => Promise.resolve({ ok: false, status: 500 })) → Error("HTTP 500") で失敗する
export function assertOk() {}

// 問15 tasks を前から順番に呼ぶ。失敗したら message（Error でなければ "不明なエラー"）を log に足して続ける。成功した値の配列を返す
//     例: logErrors([1 で成功, Error("x") で失敗, 3 で成功], log) → [1, 3] で解決し、log は ["x"]
export function logErrors() {}

// 問16 tasks をすべて同時に呼び、失敗した task の位置（0 から数える）の配列を返す
//     例: failedIndexes([成功, 失敗, 成功, 失敗]) → [1, 3] で解決する
export function failedIndexes() {}

// 問17 retry と同じだが、失敗するたびに wait(ms) で ms ミリ秒待ってからやり直す（最後の失敗の後は待たない）
//     例: retryWithDelay(2回失敗する task, 3, 100) → 200ミリ秒後に3回目の値で解決する
export function retryWithDelay() {}

// 問18 retry と同じだが、失敗したときに shouldRetry(error) が false なら、やり直さずにその失敗をすぐ投げる
//     例: retryIf(task, 3, (error) => error instanceof TypeError) → TypeError のときだけやり直す
export function retryIf() {}

// 問19 log に "開始" を足してから task を待つ。成功なら "成功"、失敗なら "失敗" を足し、どちらでも最後に "終了" を足す。結果は task と同じ（失敗はそのまま投げる）
//     例: finallyLog(失敗する task, log) → 失敗し、log は ["開始", "失敗", "終了"]
export function finallyLog() {}

// 問20 tasks をすべて同時に呼び、{ values: 成功した値の配列, errors: 失敗の message の配列 } を返す（どちらも元の順。Error でなければ "不明なエラー"）
//     例: settleAll([1 で成功, Error("x") で失敗]) → { values: [1], errors: ["x"] } で解決する
export function settleAll() {}
