// 問15 Readonly<Options> を受け取り、bold を反転した新しい Options を返す
//     例: toggleBold({ size: 12, color: "black", bold: false }).bold → true
// 引数と戻り値に型注釈を付けます。

export type Options = { size: number; color: string; bold: boolean };

export function toggleBold() {}
