// 04-q07 never型と網羅性のチェック ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/never

export function assertNever(value: never): never {
  throw new Error(`想定していない値です: ${JSON.stringify(value)}`);
}

export type Signal = "red" | "yellow" | "green";

// 問4
export function canCross(signal: Signal): boolean {
  switch (signal) {
    case "green":
      return true;
    case "yellow":
    case "red":
      return false;
    default:
      return assertNever(signal);
  }
}
