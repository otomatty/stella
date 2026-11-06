// 問1
export function resolveWith(value: string): Promise<string> {
  return Promise.resolve(value);
}

// 問2
export function rejectWith(message: string): Promise<never> {
  return Promise.reject(new Error(message));
}

// 問3
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// 問4
export function waitValue(value: string, ms: number): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(value);
    }, ms);
  });
}

// 問5
export function double(promise: Promise<number>): Promise<number> {
  return promise.then((n) => n * 2);
}

// 問6
export function lengthOf(promise: Promise<string>): Promise<number> {
  return promise.then((text) => text.length);
}

// 問7
export function trimmed(promise: Promise<string>): Promise<string> {
  return promise.then((text) => text.trim());
}

// 問8
export function addBoth(a: Promise<number>, b: Promise<number>): Promise<number> {
  return a.then((x) => b.then((y) => x + y));
}

// 問9
export function parseNumber(promise: Promise<string>): Promise<number> {
  return promise.then((text) => {
    const n = Number(text);
    if (Number.isNaN(n)) {
      throw new Error(`数ではありません: ${text}`);
    }
    return n;
  });
}

// 問10
export function recover(promise: Promise<number>): Promise<number> {
  return promise.catch(() => 0);
}

// 問11
export function errorMessage(promise: Promise<unknown>): Promise<string> {
  return promise
    .then(() => "成功")
    .catch((error: unknown) => (error instanceof Error ? error.message : "不明なエラー"));
}

// 問12
export function logDone(promise: Promise<number>, log: string[]): Promise<number> {
  return promise.finally(() => {
    log.push("done");
  });
}

// 問13
export function allNumbers(promises: Promise<number>[]): Promise<number[]> {
  return Promise.all(promises);
}

// 問14
export function sumOfAll(promises: Promise<number>[]): Promise<number> {
  return Promise.all(promises).then((values) => values.reduce((sum, n) => sum + n, 0));
}

// 問15
export function pairOf(a: Promise<string>, b: Promise<number>): Promise<[string, number]> {
  return Promise.all([a, b]);
}

// 問16
export function fastest(promises: Promise<string>[]): Promise<string> {
  return Promise.race(promises);
}

// 問17
export function settledCount(promises: Promise<number>[]): Promise<number> {
  return Promise.allSettled(promises).then(
    (results) => results.filter((r) => r.status === "fulfilled").length,
  );
}

// 問18
export function fulfilledValues(promises: Promise<number>[]): Promise<number[]> {
  return Promise.allSettled(promises).then((results) =>
    results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : [])),
  );
}

// 問19
export function rejectedMessages(promises: Promise<unknown>[]): Promise<string[]> {
  return Promise.allSettled(promises).then((results) =>
    results.flatMap((r) => {
      if (r.status === "fulfilled") {
        return [];
      }
      const reason: unknown = r.reason;
      return [reason instanceof Error ? reason.message : "不明なエラー"];
    }),
  );
}

// 問20
export function chainSteps(
  start: number,
  steps: ((n: number) => Promise<number>)[],
): Promise<number> {
  return steps.reduce((acc, step) => acc.then(step), Promise.resolve(start));
}
