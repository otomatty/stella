// 問18 fn() の値を返す。fn が例外を投げても投げなくても、最後に log に "終了" を足す（finally）。例外はそのまま外に投げる
//     例: withFinally(() => 1, log) → 1。log は ["終了"]
// 引数と戻り値に型注釈を付けます。

export function withFinally(fn: () => number, log: string[]): number {
  try {
    return fn();
  } finally {
    log.push("終了");
  }
}
