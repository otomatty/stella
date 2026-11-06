export type Result = { ok: true; value: number } | { ok: false; error: string };

// 問1
export function success(value: number): Result {
  return { ok: true, value };
}

// 問2
export function failure(error: string): Result {
  return { ok: false, error };
}

// 問3
export function isOk(result: Result): boolean {
  return result.ok;
}

// 問4
export function valueOr(result: Result, fallback: number): number {
  return result.ok ? result.value : fallback;
}

// 問5
export function errorOr(result: Result, fallback: string): string {
  return result.ok ? fallback : result.error;
}

// 問6
export function safeDivide(a: number, b: number): Result {
  if (b === 0) {
    return { ok: false, error: "0で割ることはできません" };
  }
  return { ok: true, value: a / b };
}

// 問7
export function safeSqrt(n: number): Result {
  if (n < 0) {
    return { ok: false, error: "負の数です" };
  }
  return { ok: true, value: Math.sqrt(n) };
}

// 問8
export function parseAge(text: string): Result {
  const age = Number(text);
  if (text.trim() === "" || !Number.isInteger(age) || age < 0 || age > 150) {
    return { ok: false, error: `年齢ではありません: ${text}` };
  }
  return { ok: true, value: age };
}

// 問9
export function doubleResult(result: Result): Result {
  return result.ok ? { ok: true, value: result.value * 2 } : result;
}

// 問10
export function addResults(a: Result, b: Result): Result {
  if (!a.ok) {
    return a;
  }
  if (!b.ok) {
    return b;
  }
  return { ok: true, value: a.value + b.value };
}

// 問11
export function countOk(results: readonly Result[]): number {
  return results.filter((result) => result.ok).length;
}

// 問12
export function firstError(results: readonly Result[]): string | undefined {
  for (const result of results) {
    if (!result.ok) {
      return result.error;
    }
  }
  return undefined;
}

// 問13
export function sumOk(results: readonly Result[]): number {
  let total = 0;
  for (const result of results) {
    if (result.ok) {
      total += result.value;
    }
  }
  return total;
}

// 問14
export function resultText(result: Result): string {
  return result.ok ? `成功: ${result.value}` : `失敗: ${result.error}`;
}

// 問15
export function validatePrice(price: number): Result {
  if (price < 0) {
    return { ok: false, error: "価格は0以上にしてください" };
  }
  if (!Number.isInteger(price)) {
    return { ok: false, error: "価格は整数にしてください" };
  }
  return { ok: true, value: price };
}

// 問16
export function parsePercent(text: string): Result {
  const body = text.slice(0, -1);
  const value = Number(body);
  if (!text.endsWith("%") || body === "" || Number.isNaN(value)) {
    return { ok: false, error: `割合ではありません: ${text}` };
  }
  return { ok: true, value };
}

// 問17
export function atLeast(result: Result, min: number): Result {
  if (result.ok && result.value < min) {
    return { ok: false, error: `${min}未満です` };
  }
  return result;
}

// 問18
export function allOk(results: readonly Result[]): boolean {
  return results.every((result) => result.ok);
}

// 問19
export function combineAll(results: readonly Result[]): Result {
  let total = 0;
  for (const result of results) {
    if (!result.ok) {
      return result;
    }
    total += result.value;
  }
  return { ok: true, value: total };
}

// 問20
export function orElse(first: Result, second: Result): Result {
  return first.ok ? first : second;
}
