// 04-q07 never型と網羅性のチェック ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/never

export function assertNever(value: never): never {
  throw new Error(`想定していない値です: ${JSON.stringify(value)}`);
}

export type Op = "add" | "sub" | "mul";

// 問6
export function opSymbol(op: Op): "+" | "-" | "×" {
  switch (op) {
    case "add":
      return "+";
    case "sub":
      return "-";
    case "mul":
      return "×";
    default:
      return assertNever(op);
  }
}
