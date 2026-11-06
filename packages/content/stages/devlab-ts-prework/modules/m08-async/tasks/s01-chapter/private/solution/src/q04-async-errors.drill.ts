export type Task = () => Promise<number>;
export type Result = { ok: true; value: number } | { ok: false; message: string };
export type ApiResult = { ok: boolean; status: number };

// ms ミリ秒待つ
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// 問1
export async function safeRun(task: Task): Promise<number | undefined> {
  try {
    return await task();
  } catch {
    return undefined;
  }
}

// 問2
export async function runOr(task: Task, fallback: number): Promise<number> {
  try {
    return await task();
  } catch {
    return fallback;
  }
}

// 問3
export async function errorText(task: Task): Promise<string> {
  try {
    await task();
    return "OK";
  } catch (error) {
    return error instanceof Error ? error.message : "不明なエラー";
  }
}

// 問4
export async function toResult(task: Task): Promise<Result> {
  try {
    return { ok: true, value: await task() };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "不明なエラー" };
  }
}

// 問5
export async function withContext(task: Task, context: string): Promise<number> {
  try {
    return await task();
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    throw new Error(`${context}: ${message}`, { cause: error });
  }
}

// 問6
export async function retryOnce(task: Task): Promise<number> {
  try {
    return await task();
  } catch {
    return await task();
  }
}

// 問7
export async function retry(task: Task, attempts: number): Promise<number> {
  let lastError: unknown = new Error("attempts は1以上にしてください");
  for (let i = 0; i < attempts; i++) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

// 問8
export async function attemptsNeeded(task: Task, max: number): Promise<number> {
  let lastError: unknown = new Error("max は1以上にしてください");
  for (let i = 1; i <= max; i++) {
    try {
      await task();
      return i;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

// 問9
export async function firstSuccess(tasks: readonly Task[]): Promise<number> {
  for (const task of tasks) {
    try {
      return await task();
    } catch {
      // 次の task を試す
    }
  }
  throw new Error("すべて失敗しました");
}

// 問10
export async function countFailures(tasks: readonly Task[]): Promise<number> {
  const results = await Promise.allSettled(tasks.map((task) => task()));
  return results.filter((r) => r.status === "rejected").length;
}

// 問11
export async function withCleanup(task: Task, cleanup: () => void): Promise<number> {
  try {
    return await task();
  } finally {
    cleanup();
  }
}

// 問12
export async function withTimeout(task: Task, ms: number): Promise<number> {
  const timer = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error("タイムアウトしました"));
    }, ms);
  });
  return await Promise.race([task(), timer]);
}

// 問13
export async function parseAge(task: () => Promise<string>): Promise<number> {
  const text = await task();
  const age = Number(text);
  if (!Number.isInteger(age) || age < 0) {
    throw new Error(`年齢が正しくありません: ${text}`);
  }
  return age;
}

// 問14
export async function assertOk(task: () => Promise<ApiResult>): Promise<number> {
  const result = await task();
  if (!result.ok) {
    throw new Error(`HTTP ${result.status}`);
  }
  return result.status;
}

// 問15
export async function logErrors(tasks: readonly Task[], log: string[]): Promise<number[]> {
  const values: number[] = [];
  for (const task of tasks) {
    try {
      values.push(await task());
    } catch (error) {
      log.push(error instanceof Error ? error.message : "不明なエラー");
    }
  }
  return values;
}

// 問16
export async function failedIndexes(tasks: readonly Task[]): Promise<number[]> {
  const results = await Promise.allSettled(tasks.map((task) => task()));
  return results.flatMap((r, i) => (r.status === "rejected" ? [i] : []));
}

// 問17
export async function retryWithDelay(task: Task, attempts: number, ms: number): Promise<number> {
  let lastError: unknown = new Error("attempts は1以上にしてください");
  for (let i = 0; i < attempts; i++) {
    if (i > 0) {
      await wait(ms);
    }
    try {
      return await task();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

// 問18
export async function retryIf(
  task: Task,
  attempts: number,
  shouldRetry: (error: unknown) => boolean,
): Promise<number> {
  let lastError: unknown = new Error("attempts は1以上にしてください");
  for (let i = 0; i < attempts; i++) {
    try {
      return await task();
    } catch (error) {
      if (!shouldRetry(error)) {
        throw error;
      }
      lastError = error;
    }
  }
  throw lastError;
}

// 問19
export async function finallyLog(task: Task, log: string[]): Promise<number> {
  log.push("開始");
  try {
    const value = await task();
    log.push("成功");
    return value;
  } catch (error) {
    log.push("失敗");
    throw error;
  } finally {
    log.push("終了");
  }
}

// 問20
export async function settleAll(
  tasks: readonly Task[],
): Promise<{ values: number[]; errors: string[] }> {
  const results = await Promise.allSettled(tasks.map((task) => task()));
  const values: number[] = [];
  const errors: string[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      values.push(result.value);
    } else {
      const reason: unknown = result.reason;
      errors.push(reason instanceof Error ? reason.message : "不明なエラー");
    }
  }
  return { values, errors };
}
