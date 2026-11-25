// 問5 add は a + b、sub は a - b、mul は a × b を返す
//     例: applyOp("mul", 3, 4) → 12
// 引数と戻り値に型注釈を付けます。
// switch で分け、default で用意されている assertNever を呼んだ結果を返します。
export function assertNever(value: never): never {
  throw new Error(`想定していない値です: ${JSON.stringify(value)}`);
}

export type Op = "add" | "sub" | "mul";

export function applyOp() {}
