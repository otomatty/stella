// 問16 Partial<Options> の size を返す。なければ fallback
//     例: sizeOr({}, 16) → 16
// 引数と戻り値に型注釈を付けます。

export type Options = { size: number; color: string; bold: boolean };

export function sizeOr() {}
