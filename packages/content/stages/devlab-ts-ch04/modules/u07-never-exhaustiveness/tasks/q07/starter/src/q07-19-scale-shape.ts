// 問19 大きさを k 倍した、新しい図形を返す
//     例: scaleShape({ kind: "square", size: 2 }, 3) → { kind: "square", size: 6 }
// 引数と戻り値に型注釈を付けます。
// switch で分け、default で用意されている assertNever を呼んだ結果を返します。
export function assertNever(value: never): never {
  throw new Error(`想定していない値です: ${JSON.stringify(value)}`);
}

export type Shape = { kind: "circle"; radius: number } | { kind: "square"; size: number };

export function scaleShape() {}
