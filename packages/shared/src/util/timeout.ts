/**
 * テスト実行で共有するタイムアウト/Promise ヘルパ。
 *
 * 本番 (`packages/client/api/_lib/quickjs-runner.ts`, QuickJS) と
 * 採点回帰テスト (`packages/shared/test/runner.ts`, Node vm) の両方が、
 * テスト式が返した Promise の解決を待ち合わせる必要がある。
 * VM 側の `timeout` オプションは同期実行時間しかカバーしないため、
 * Promise チェーンが暴走するケースに備えてホスト側で別途
 * ウォール時計タイムアウトを掛ける。
 */

export function isThenable(v: unknown): v is PromiseLike<unknown> {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as { then?: unknown }).then === "function"
  );
}

export function withWallTimeout<T>(
  promise: Promise<T>,
  ms: number,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("TIMEOUT")), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e instanceof Error ? e : new Error(String(e)));
      },
    );
  });
}
