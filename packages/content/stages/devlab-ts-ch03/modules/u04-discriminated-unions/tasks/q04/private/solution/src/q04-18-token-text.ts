// 問18 型 Token（{ type: "number"; value } か { type: "plus" } か { type: "minus" }）を定義して export し、tokenText(token: Token) を書く。number は数字、plus は "+"、minus は "-"
//     例: tokenText({ type: "plus" }) → "+"
// 引数と戻り値に型注釈を付ける。
// type と | を使い、判別可能なユニオン型を定義する。

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
