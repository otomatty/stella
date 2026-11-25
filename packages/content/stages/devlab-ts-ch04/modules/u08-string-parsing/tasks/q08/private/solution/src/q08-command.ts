// 問題
// "add 3 5" のような文字列のコマンドを読み取って計算する、小さな電卓を作ります。
// 型 Command と RunResult は定義済みです。引数と戻り値には型注釈を付けること。
//
// 1. parseCommand(text)
//    文字列を Command にする。前後の空白を取り除き、空白（いくつ続いてもよい）で区切る。
//    次のときは、決められたメッセージで Error を投げる
//    - 3つに区切れない:                 "書き方が正しくありません: <text>"
//    - 1つ目が add、sub、mul、div 以外: "知らない計算です: <1つ目>"
//    - 2つ目か3つ目が有限の数値でない: "数値ではありません: <その文字列>"
//    例: parseCommand("add 3 5") → { op: "add", a: 3, b: 5 }
//
// 2. execute(command)
//    計算して結果を返す。switch で op ごとに分ける。div で b が 0 なら "0で割ることはできません" の Error を投げる
//
// 3. run(text)
//    parseCommand と execute を順に呼ぶ。成功なら { ok: true, value }、
//    途中で例外が出たら catch して { ok: false, error: メッセージ } を返す
//
// 4. runAll(lines)
//    1行ずつ run し、成功なら "add 3 5 = 8"（前後の空白を除いた元の行 = 結果）、
//    失敗なら "エラー: メッセージ" を並べた配列を返す。引数は readonly string[]
//
// このファイルに書く関数（export は不要）
// - errorMessage(error): unknown の値からメッセージを取り出す。
//   Error なら message を、文字列ならその文字列を、それ以外は "不明なエラー" を返す。
//   run の catch で使う。
// - toNumber(value): unknown の値が有限の数値ならそのまま返す。前後の空白を除いて空でない文字列は、
//   有限の数値に変換できればその数値を返す。それ以外は null を返す。戻り値は number | null。
//   parseCommand の数値の読み取りに使い、null なら "数値ではありません: …" の Error を投げる。
// - assertNever(value): 引数も戻り値も never。呼ばれたら Error を投げる（メッセージは自由）。
//   execute の switch の default で使い、case の書き忘れを型エラーで確かめる。
// toNumber では Number で変換し、Number.isFinite で有限の数値か確かめます。
function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "不明なエラー";
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function assertNever(value: never): never {
  throw new Error(`想定していない値です: ${JSON.stringify(value)}`);
}

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
