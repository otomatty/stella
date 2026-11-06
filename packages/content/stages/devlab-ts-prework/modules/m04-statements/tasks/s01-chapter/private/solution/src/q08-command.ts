import { errorMessage } from "./q05-exception";
import { toNumber } from "./q06-unknown";
import { assertNever } from "./q07-never";

export type Command = { op: "add" | "sub" | "mul" | "div"; a: number; b: number };

export type RunResult = { ok: true; value: number } | { ok: false; error: string };

function toFiniteNumber(text: string): number {
  const n = toNumber(text);
  if (n === null) {
    throw new Error(`数値ではありません: ${text}`);
  }
  return n;
}

export function parseCommand(text: string): Command {
  const parts = text.trim().split(/\s+/);
  const [op, a, b] = parts;
  if (parts.length !== 3 || op === undefined || a === undefined || b === undefined) {
    throw new Error(`書き方が正しくありません: ${text}`);
  }
  if (op !== "add" && op !== "sub" && op !== "mul" && op !== "div") {
    throw new Error(`知らない計算です: ${op}`);
  }
  return { op, a: toFiniteNumber(a), b: toFiniteNumber(b) };
}

export function execute(command: Command): number {
  const { op, a, b } = command;
  switch (op) {
    case "add":
      return a + b;
    case "sub":
      return a - b;
    case "mul":
      return a * b;
    case "div":
      if (b === 0) {
        throw new Error("0で割ることはできません");
      }
      return a / b;
    default:
      return assertNever(op);
  }
}

export function run(text: string): RunResult {
  try {
    return { ok: true, value: execute(parseCommand(text)) };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export function runAll(lines: readonly string[]): string[] {
  return lines.map((line) => {
    const result = run(line);
    return result.ok ? `${line.trim()} = ${result.value}` : `エラー: ${result.error}`;
  });
}
