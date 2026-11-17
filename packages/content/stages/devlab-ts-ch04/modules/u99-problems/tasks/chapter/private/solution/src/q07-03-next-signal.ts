// 04-q07 never型と網羅性のチェック ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/never

export function assertNever(value: never): never {
  throw new Error(`想定していない値です: ${JSON.stringify(value)}`);
}

export type Signal = "red" | "yellow" | "green";

// 問3
export function nextSignal(signal: Signal): Signal {
  switch (signal) {
    case "green":
      return "yellow";
    case "yellow":
      return "red";
    case "red":
      return "green";
    default:
      return assertNever(signal);
  }
}
