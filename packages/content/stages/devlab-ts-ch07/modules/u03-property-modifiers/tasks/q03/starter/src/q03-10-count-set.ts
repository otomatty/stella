// 問10 Partial<Options> のうち、値が入っているプロパティの数を返す
//     例: countSet({ size: 1, bold: false }) → 2
// 引数と戻り値に型注釈を付けます。

export type Options = { size: number; color: string; bold: boolean };

export function countSet() {}
