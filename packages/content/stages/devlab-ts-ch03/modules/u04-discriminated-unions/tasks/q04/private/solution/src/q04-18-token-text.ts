// 03-q04 判別可能なユニオン型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union

// 問18
export type Token = { type: "number"; value: number } | { type: "plus" } | { type: "minus" };

export function tokenText(token: Token): string {
  switch (token.type) {
    case "number":
      return String(token.value);
    case "plus":
      return "+";
    case "minus":
      return "-";
  }
}
