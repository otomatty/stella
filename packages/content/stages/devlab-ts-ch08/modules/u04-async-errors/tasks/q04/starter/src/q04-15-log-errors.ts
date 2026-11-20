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

// 問15 tasks を前から順番に呼ぶ。失敗したら message（Error でなければ "不明なエラー"）を log に足して続ける。成功した値の配列を返す
//     例: logErrors([1 で成功, Error("x") で失敗, 3 で成功], log) → [1, 3] で解決し、log は ["x"]
export function logErrors() {}
