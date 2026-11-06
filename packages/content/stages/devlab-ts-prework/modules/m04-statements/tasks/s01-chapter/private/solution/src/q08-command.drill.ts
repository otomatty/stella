// 問1
export function parseKeyValue(text: string): [string, string] {
  const index = text.indexOf("=");
  if (index === -1) {
    throw new Error(`= がありません: ${text}`);
  }
  return [text.slice(0, index), text.slice(index + 1)];
}

// 問2
export function parseNumberList(text: string): number[] {
  const result: number[] = [];
  for (const part of text.split(",")) {
    const trimmed = part.trim();
    const n = Number(trimmed);
    if (trimmed === "" || !Number.isFinite(n)) {
      throw new Error(`数値ではありません: ${trimmed}`);
    }
    result.push(n);
  }
  return result;
}

// 問3
export function parseYesNo(text: string): boolean {
  switch (text.toLowerCase()) {
    case "true":
    case "yes":
    case "1":
      return true;
    case "false":
    case "no":
    case "0":
      return false;
    default:
      throw new Error(`真偽値ではありません: ${text}`);
  }
}

// 問4
export function parseClock(text: string): number {
  const [h = "", m = "", ...rest] = text.split(":");
  const hour = Number(h);
  const minute = Number(m);
  if (
    rest.length > 0 ||
    h === "" ||
    m === "" ||
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    throw new Error(`時刻ではありません: ${text}`);
  }
  return hour * 60 + minute;
}

// 問5
export function parseDateParts(text: string): [number, number, number] {
  const parts = text.split("-");
  const [y, m, d] = parts.map(Number);
  if (
    parts.length !== 3 ||
    y === undefined ||
    m === undefined ||
    d === undefined ||
    !Number.isInteger(y) ||
    !Number.isInteger(m) ||
    !Number.isInteger(d)
  ) {
    throw new Error(`日付ではありません: ${text}`);
  }
  return [y, m, d];
}

// 問6
export function parseByteSize(text: string): number {
  const match = /^(\d+)(B|KB|MB)$/.exec(text);
  if (match === null) {
    throw new Error(`大きさではありません: ${text}`);
  }
  const value = Number(match[1]);
  switch (match[2] ?? "") {
    case "KB":
      return value * 1024;
    case "MB":
      return value * 1024 * 1024;
    default:
      return value;
  }
}

// 問7
export function parseSeconds(text: string): number {
  const unit = text.slice(-1);
  const value = Number(text.slice(0, -1));
  if (text.length < 2 || !Number.isFinite(value)) {
    throw new Error(`時間ではありません: ${text}`);
  }
  switch (unit) {
    case "s":
      return value;
    case "m":
      return value * 60;
    case "h":
      return value * 3600;
    default:
      throw new Error(`時間ではありません: ${text}`);
  }
}

// 問8
export function parseRange(text: string): [number, number] {
  const parts = text.split("-");
  const start = Number(parts[0]);
  const end = Number(parts[1]);
  if (parts.length !== 2 || !Number.isFinite(start) || !Number.isFinite(end) || start > end) {
    throw new Error(`範囲ではありません: ${text}`);
  }
  return [start, end];
}

// 問9
export function parseHexColor(text: string): [number, number, number] {
  if (!/^#[0-9a-fA-F]{6}$/.test(text)) {
    throw new Error(`色ではありません: ${text}`);
  }
  return [
    Number.parseInt(text.slice(1, 3), 16),
    Number.parseInt(text.slice(3, 5), 16),
    Number.parseInt(text.slice(5, 7), 16),
  ];
}

// 問10
export function parseRatio(text: string): number {
  const value = Number(text.slice(0, -1));
  if (!text.endsWith("%") || text.length < 2 || !Number.isFinite(value)) {
    throw new Error(`割合ではありません: ${text}`);
  }
  return value / 100;
}

// 問11
export function parseQuery(text: string): { [key: string]: string } {
  const result: { [key: string]: string } = {};
  if (text === "") {
    return result;
  }
  for (const pair of text.split("&")) {
    const index = pair.indexOf("=");
    if (index === -1) {
      result[pair] = "";
    } else {
      result[pair.slice(0, index)] = pair.slice(index + 1);
    }
  }
  return result;
}

// 問12
export function parseCsvLine(text: string): string[] {
  return text.split(",").map((part) => part.trim());
}

// 問13
export function parseVersion(text: string): [number, number, number] {
  if (!/^\d+\.\d+\.\d+$/.test(text)) {
    throw new Error(`バージョンではありません: ${text}`);
  }
  const [major = 0, minor = 0, patch = 0] = text.split(".").map(Number);
  return [major, minor, patch];
}

// 問14
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x < y) {
      return -1;
    }
    if (x > y) {
      return 1;
    }
  }
  return 0;
}

// 問15
export function parseOperator(text: string): "+" | "-" | "*" | "/" {
  if (text === "+" || text === "-" || text === "*" || text === "/") {
    return text;
  }
  throw new Error(`演算子ではありません: ${text}`);
}

// 問16
export function evaluate(text: string): number {
  const [a, op, b, ...rest] = text.trim().split(/\s+/);
  const x = Number(a);
  const y = Number(b);
  if (
    rest.length > 0 ||
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    a === undefined ||
    b === undefined
  ) {
    throw new Error(`式ではありません: ${text}`);
  }
  switch (op ?? "") {
    case "+":
      return x + y;
    case "-":
      return x - y;
    case "*":
      return x * y;
    case "/":
      if (y === 0) {
        throw new Error("0で割ることはできません");
      }
      return x / y;
    default:
      throw new Error(`式ではありません: ${text}`);
  }
}

// 問17
export function commandName(text: string): string {
  const first = text.trim().split(/\s+/)[0] ?? "";
  if (first === "") {
    throw new Error("コマンドがありません");
  }
  return first.toLowerCase();
}

// 問18
export function commandArgs(text: string): string[] {
  const words = text.trim().split(/\s+/);
  return words.slice(1).filter((word) => word !== "");
}

// 問19
export function tryParseInt(
  text: string,
): { ok: true; value: number } | { ok: false; error: string } {
  if (!/^-?\d+$/.test(text)) {
    return { ok: false, error: `整数ではありません: ${text}` };
  }
  return { ok: true, value: Number(text) };
}

// 問20
export function nonEmptyLines(text: string): string[] {
  const result: string[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed !== "") {
      result.push(trimmed);
    }
  }
  return result;
}
