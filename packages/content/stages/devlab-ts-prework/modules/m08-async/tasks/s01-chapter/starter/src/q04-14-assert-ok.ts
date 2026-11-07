// 08-q04 非同期のエラー処理 ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous/await
//       https://typescriptbook.jp/reference/statements/exception
//
// async・await と try・catch・finally を使って書いてください。型 Task・Result・ApiResult と関数 wait は定義済みです。
// Task は「呼ぶたびに処理を始め、数値で解決するか失敗する関数」です。呼んだ回数だけ処理が走ります。
// catch で受け取る値の型は unknown です。message を使うときは、error instanceof Error で確かめてから使う。
// try の中で Promise を return するときは return await と書く（await がないと、その失敗は catch で捕まえられない）。

export type ApiResult = { ok: boolean; status: number };

// 問14 task（ApiResult で解決する）を待ち、ok なら status を返す。ok でなければ `HTTP 500` の形の Error を投げる
//     例: assertOk(() => Promise.resolve({ ok: false, status: 500 })) → Error("HTTP 500") で失敗する
export function assertOk() {}
