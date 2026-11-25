// 問6 options を patch（Partial<Options>）で上書きした、新しい Options を返す
//     例: patchOptions(options, { bold: true }) → bold だけ true
// 引数と戻り値に型注釈を付けます。

export type Options = { size: number; color: string; bold: boolean };

export function patchOptions() {}
