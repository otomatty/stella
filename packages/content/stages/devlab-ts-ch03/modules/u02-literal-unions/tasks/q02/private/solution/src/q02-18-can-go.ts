// 問18 型 Signal（"red"、"yellow"、"green"）を定義して export し、canGo(signal: Signal) を書く。green なら true
//     例: canGo("green") → true
// 引数と戻り値に型注釈を付ける。
// type と | を使い、リテラル型のユニオンを定義する。

export type Signal = "red" | "yellow" | "green";

export function canGo(signal: Signal): boolean {
  return signal === "green";
}
