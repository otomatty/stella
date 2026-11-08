// 04-q07 never型と網羅性のチェック ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/never

export function assertNever(value: never): never {
  throw new Error(`想定していない値です: ${JSON.stringify(value)}`);
}

export type Signal = "red" | "yellow" | "green";

// 問17
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
