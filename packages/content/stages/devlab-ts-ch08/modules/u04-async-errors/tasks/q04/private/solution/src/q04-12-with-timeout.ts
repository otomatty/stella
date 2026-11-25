// 問12 task が ms ミリ秒以内に終われば、その値を返す。間に合わなければ "タイムアウトしました" の Error を投げる
//     例: withTimeout(200ミリ秒かかる task, 100) → Error("タイムアウトしました") で失敗する
// async と await を使ってください。

export type Task = () => Promise<number>;

// ms ミリ秒待つ
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function withTimeout(task: Task, ms: number): Promise<number> {
  const timer = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error("タイムアウトしました"));
    }, ms);
  });
  return await Promise.race([task(), timer]);
}
