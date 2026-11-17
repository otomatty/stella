export type Result<T> = { ok: true; value: T } | { ok: false; error: Error };

export async function tryAsync<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, value: await fn() };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
  }
}

export async function withRetry<T>(fn: () => Promise<T>, attempts: number): Promise<T> {
  if (attempts < 1) {
    throw new Error("attempts は1以上にしてください");
  }
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

export async function firstSuccessful<T>(tasks: readonly (() => Promise<T>)[]): Promise<T> {
  for (const task of tasks) {
    try {
      return await task();
    } catch {
      // 次の task を試す
    }
  }
  throw new Error("すべて失敗しました");
}

export async function runAll<T>(
  tasks: readonly (() => Promise<T>)[],
): Promise<{ values: T[]; errors: string[] }> {
  const values: T[] = [];
  const errors: string[] = [];
  for (const task of tasks) {
    try {
      values.push(await task());
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "不明なエラー");
    }
  }
  return { values, errors };
}
