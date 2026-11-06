// 問1
export function requirePositive(n: number): number {
  if (n <= 0) {
    throw new Error("正の数が必要です");
  }
  return n;
}

// 問2
export function divide(a: number, b: number): number {
  if (b === 0) {
    throw new Error("0で割ることはできません");
  }
  return a / b;
}

// 問3
export function parseIntStrict(text: string): number {
  if (!/^-?\d+$/.test(text)) {
    throw new Error(`整数ではありません: ${text}`);
  }
  return Number(text);
}

// 問4
export function itemAt(items: readonly string[], index: number): string {
  const item = items[index];
  if (item === undefined) {
    throw new Error(`範囲外です: ${index}`);
  }
  return item;
}

// 問5
export function isValidJson(text: string): boolean {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

// 問6
export function isValidUrl(text: string): boolean {
  try {
    new URL(text);
    return true;
  } catch {
    return false;
  }
}

// 問7
export function hostOf(text: string): string {
  try {
    return new URL(text).hostname;
  } catch {
    return "";
  }
}

// 問8
export function safeRepeat(text: string, times: number): string {
  try {
    return text.repeat(times);
  } catch {
    return "";
  }
}

// 問9
export function decodeOr(text: string, fallback: string): string {
  try {
    return decodeURIComponent(text);
  } catch {
    return fallback;
  }
}

// 問10
export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// 問11
export function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "Unknown";
}

// 問12
export function toBigIntOrNull(text: string): bigint | null {
  try {
    return BigInt(text);
  } catch {
    return null;
  }
}

// 問13
export function validateUsername(name: string): void {
  if (name === "") {
    throw new Error("名前を入力してください");
  }
  if (name.length > 20) {
    throw new Error("20文字以内にしてください");
  }
  if (name.includes(" ")) {
    throw new Error("空白は使えません");
  }
}

// 問14
export function checkAge(age: number): void {
  if (age < 0 || age > 150) {
    throw new RangeError("年齢は0〜150にしてください");
  }
}

// 問15
export function isRangeError(error: unknown): boolean {
  return error instanceof RangeError;
}

// 問16
export function readPort(json: string): number {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error("port がありません");
  }
  if (
    typeof data === "object" &&
    data !== null &&
    "port" in data &&
    typeof data.port === "number"
  ) {
    return data.port;
  }
  throw new Error("port がありません");
}

// 問17
export function countInvalidJson(texts: readonly string[]): number {
  let count = 0;
  for (const text of texts) {
    try {
      JSON.parse(text);
    } catch {
      count++;
    }
  }
  return count;
}

// 問18
export function loadSettings(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error("設定を読めません", { cause: error });
  }
}

// 問19
export function checkWithLog(log: string[], text: string): boolean {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  } finally {
    log.push("checked");
  }
}

// 問20
export function requireText(text: string): string {
  const trimmed = text.trim();
  if (trimmed === "") {
    throw new Error("空です");
  }
  return trimmed;
}
