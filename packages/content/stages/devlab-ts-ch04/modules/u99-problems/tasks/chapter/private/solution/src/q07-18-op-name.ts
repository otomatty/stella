// 04-q07 never型と網羅性のチェック ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/never

export function assertNever(value: never): never {
  throw new Error(`想定していない値です: ${JSON.stringify(value)}`);
}

export type Op = "add" | "sub" | "mul";

// 問18
export function opName(op: Op): "足し算" | "引き算" | "掛け算" {
  switch (op) {
    case "add":
      return "足し算";
    case "sub":
      return "引き算";
    case "mul":
      return "掛け算";
    default:
      return assertNever(op);
  }
}
