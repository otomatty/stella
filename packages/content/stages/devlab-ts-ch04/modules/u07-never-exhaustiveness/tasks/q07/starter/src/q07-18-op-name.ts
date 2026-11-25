// 問18 add は "足し算"、sub は "引き算"、mul は "掛け算" を返す
//     例: opName("add") → "足し算"
// 引数と戻り値に型注釈を付けます。
// switch で分け、default で用意されている assertNever を呼んだ結果を返します。
export function assertNever(value: never): never {
  throw new Error(`想定していない値です: ${JSON.stringify(value)}`);
}

export type Op = "add" | "sub" | "mul";

export function opName() {}
