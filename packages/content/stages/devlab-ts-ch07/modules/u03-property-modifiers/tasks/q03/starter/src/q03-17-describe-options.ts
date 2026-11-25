// 問17 Readonly<Options> を "12px black" の形にする。bold が true なら後ろに " 太字" を付ける
//     例: describeOptions({ size: 12, color: "black", bold: true }) → "12px black 太字"
// 引数と戻り値に型注釈を付けます。

export type Options = { size: number; color: string; bold: boolean };

export function describeOptions() {}
