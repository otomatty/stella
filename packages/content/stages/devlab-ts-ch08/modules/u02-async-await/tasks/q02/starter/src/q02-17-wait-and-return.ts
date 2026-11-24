// 問17 wait(ms) を await で待ってから、value を返す
//     例: waitAndReturn(100, "a") → 100ミリ秒後に "a" で解決する
// async 関数として書いてください。
// 戻り値の型は Promise<…> と明記してください。

// ms ミリ秒待つ
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function waitAndReturn() {}
