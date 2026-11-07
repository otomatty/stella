// 08-q04 非同期のエラー処理 ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous/await
//       https://typescriptbook.jp/reference/statements/exception
//
// async・await と try・catch・finally を使って書いてください。型 Task・Result・ApiResult と関数 wait は定義済みです。
// Task は「呼ぶたびに処理を始め、数値で解決するか失敗する関数」です。呼んだ回数だけ処理が走ります。
// catch で受け取る値の型は unknown です。message を使うときは、error instanceof Error で確かめてから使う。
// try の中で Promise を return するときは return await と書く（await がないと、その失敗は catch で捕まえられない）。

export type Task = () => Promise<number>;

// 問19 log に "開始" を足してから task を待つ。成功なら "成功"、失敗なら "失敗" を足し、どちらでも最後に "終了" を足す。結果は task と同じ（失敗はそのまま投げる）
//     例: finallyLog(失敗する task, log) → 失敗し、log は ["開始", "失敗", "終了"]
export function finallyLog() {}
