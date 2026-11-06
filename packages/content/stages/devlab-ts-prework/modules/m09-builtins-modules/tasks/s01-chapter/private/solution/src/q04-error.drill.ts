export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export class NotFoundError extends HttpError {
  constructor(resource: string) {
    super(404, `${resource} が見つかりません`);
    this.name = "NotFoundError";
  }
}

// 問1
export function fail(message: string): never {
  throw new Error(message);
}

// 問2
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "不明なエラー";
}

// 問3
export function checkRange(n: number, min: number, max: number): number {
  if (n < min || n > max) {
    throw new RangeError(`${n} は ${min}〜${max} の範囲外です`);
  }
  return n;
}

// 問4
export function requireString(value: unknown): string {
  if (typeof value !== "string") {
    throw new TypeError("文字列ではありません");
  }
  return value;
}

// 問5
export function parseJsonOrNull(text: string): unknown {
  try {
    const data: unknown = JSON.parse(text);
    return data;
  } catch (error) {
    if (error instanceof SyntaxError) {
      return null;
    }
    throw error;
  }
}

// 問6
export function errorKind(error: unknown): string {
  if (error instanceof TypeError) {
    return "TypeError";
  }
  if (error instanceof RangeError) {
    return "RangeError";
  }
  if (error instanceof SyntaxError) {
    return "SyntaxError";
  }
  if (error instanceof Error) {
    return "Error";
  }
  return "unknown";
}

// 問7
export class ValidationError extends Error {
  readonly field: string;

  constructor(field: string, message: string) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
  }
}

// 問8
export class TimeoutError extends Error {
  readonly ms: number;

  constructor(ms: number) {
    super(`${ms}ミリ秒でタイムアウトしました`);
    this.name = "TimeoutError";
    this.ms = ms;
  }
}

// 問9
export function httpStatusOf(error: unknown): number | undefined {
  return error instanceof HttpError ? error.status : undefined;
}

// 問10
export function isNotFound(error: unknown): boolean {
  return error instanceof NotFoundError || (error instanceof HttpError && error.status === 404);
}

// 問11
export function toHttpError(status: number): HttpError {
  return status === 404 ? new NotFoundError("ページ") : new HttpError(status, `HTTP ${status}`);
}

// 問12
export function statusMessage(error: unknown): string {
  if (error instanceof NotFoundError) {
    return "見つかりません";
  }
  if (error instanceof HttpError) {
    return `通信エラー（${error.status}）`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "不明なエラー";
}

// 問13
export function wrapError(error: unknown, message: string): Error {
  return new Error(message, { cause: error });
}

// 問14
export function rootCause(error: unknown): unknown {
  let current = error;
  while (current instanceof Error && current.cause !== undefined) {
    current = current.cause;
  }
  return current;
}

// 問15
export function tryOr(fn: () => number, fallback: number): number {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

// 問16
export function attempt(
  fn: () => number,
): { ok: true; value: number } | { ok: false; error: Error } {
  try {
    return { ok: true, value: fn() };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
  }
}

// 問17
export function collectErrors(fns: (() => void)[]): string[] {
  const messages: string[] = [];
  for (const fn of fns) {
    try {
      fn();
    } catch (error) {
      messages.push(error instanceof Error ? error.message : "不明なエラー");
    }
  }
  return messages;
}

// 問18
export function withFinally(fn: () => number, log: string[]): number {
  try {
    return fn();
  } finally {
    log.push("終了");
  }
}

// 問19
export function validateAll(values: number[]): void {
  const errors = values.filter((n) => n < 0).map((n) => new RangeError(`${n} は負の数です`));
  if (errors.length > 0) {
    throw new AggregateError(errors, "負の数があります");
  }
}

// 問20
export function errorToJson(error: unknown): { name: string; message: string } {
  if (error instanceof Error) {
    return { name: error.name, message: error.message };
  }
  return { name: "Unknown", message: String(error) };
}
