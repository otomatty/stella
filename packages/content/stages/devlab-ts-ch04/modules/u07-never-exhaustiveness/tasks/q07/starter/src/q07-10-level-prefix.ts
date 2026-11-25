// 問10 "[DEBUG]"、"[INFO]"、"[WARN]"、"[ERROR]" を返す
//     例: levelPrefix("info") → "[INFO]"
// 引数と戻り値に型注釈を付けます。
// switch で分け、default で用意されている assertNever を呼んだ結果を返します。
export function assertNever(value: never): never {
  throw new Error(`想定していない値です: ${JSON.stringify(value)}`);
}

export type LogLevel = "debug" | "info" | "warn" | "error";

export function levelPrefix() {}
