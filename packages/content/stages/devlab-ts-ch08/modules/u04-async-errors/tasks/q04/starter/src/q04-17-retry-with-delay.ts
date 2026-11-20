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

// ms ミリ秒待つ
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// 問17 retry と同じだが、失敗するたびに wait(ms) で ms ミリ秒待ってからやり直す（最後の失敗の後は待たない）
//     例: retryWithDelay(2回失敗する task, 3, 100) → 200ミリ秒後に3回目の値で解決する
export function retryWithDelay() {}
