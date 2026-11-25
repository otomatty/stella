// 問17 retry と同じだが、失敗するたびに wait(ms) で ms ミリ秒待ってからやり直す（最後の失敗の後は待たない）
//     例: retryWithDelay(2回失敗する task, 3, 100) → 200ミリ秒後に3回目の値で解決する
// async と await を使ってください。
// 失敗は try・catch で受け止めてください。

export type Task = () => Promise<number>;

// ms ミリ秒待つ
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function retryWithDelay() {}
