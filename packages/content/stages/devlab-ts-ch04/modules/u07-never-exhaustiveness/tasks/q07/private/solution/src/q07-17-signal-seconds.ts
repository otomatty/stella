// 問17 信号の長さ（秒）を返す。green は 30、yellow は 3、red は 27
//     例: signalSeconds("yellow") → 3
// 引数と戻り値に型注釈を付けます。
// switch で分け、default で用意されている assertNever を呼んだ結果を返します。
export function assertNever(value: never): never {
  throw new Error(`想定していない値です: ${JSON.stringify(value)}`);
}

export type Signal = "red" | "yellow" | "green";

export function signalSeconds(signal: Signal): number {
  switch (signal) {
    case "green":
      return 30;
    case "yellow":
      return 3;
    case "red":
      return 27;
    default:
      return assertNever(signal);
  }
}
