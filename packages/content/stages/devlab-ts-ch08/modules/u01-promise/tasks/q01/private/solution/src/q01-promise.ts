// 問題
// 次の関数を書いてください。このファイルでは async と await を使わず、
// new Promise、then・catch・finally、Promise.all・Promise.race などで書くこと（async/await は q02 で扱う）。
// 型変数（07章）を使うものは、引数の Promise の中身の型に合わせて戻り値の型が変わるようにする。
//
// 1. delay(ms)
//    ms ミリ秒たったら解決する Promise<void> を返す（new Promise と setTimeout）
//
// 2. timeout(promise, ms)
//    promise が ms ミリ秒以内に解決したら、その値で解決する。
//    間に合わなければ "タイムアウトしました" の Error で失敗する（Promise.race）
//
// 3. withLoading(promise, setLoading)
//    最初に setLoading(true) を呼び、promise が成功しても失敗しても、終わったら setLoading(false) を呼ぶ。
//    戻り値は promise と同じ結果（成功ならその値、失敗ならその失敗）になる Promise
//
// 4. orDefault(promise, fallback)
//    promise が成功したらその値、失敗したら fallback で解決する Promise を返す
//
// 5. sumAll(promises)
//    数値の Promise の配列を受け取り、すべて解決したら合計で解決する Promise<number> を返す。
//    1つでも失敗したら、その失敗をそのまま返す

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function timeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timer = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error("タイムアウトしました"));
    }, ms);
  });
  return Promise.race([promise, timer]);
}

export function withLoading<T>(
  promise: Promise<T>,
  setLoading: (loading: boolean) => void,
): Promise<T> {
  setLoading(true);
  return promise.finally(() => {
    setLoading(false);
  });
}

export function orDefault<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return promise.catch(() => fallback);
}

export function sumAll(promises: readonly Promise<number>[]): Promise<number> {
  return Promise.all(promises).then((values) => values.reduce((sum, n) => sum + n, 0));
}
