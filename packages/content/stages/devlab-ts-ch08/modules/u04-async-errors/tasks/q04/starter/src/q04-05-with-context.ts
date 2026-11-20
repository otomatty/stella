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

// 問5 失敗したら `${context}: ${元の message}` の Error を投げ直す。元の失敗は { cause: error } で新しい Error に持たせる
//     例: withContext(Error("x") で失敗する task, "保存") → Error("保存: x") で失敗する
export function withContext() {}
