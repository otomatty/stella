// 問19 何も指定していない Partial<Options>（空のオブジェクト）を返す
//     例: emptyPatch() → {}
// 戻り値に型注釈を付けます。

export type Options = { size: number; color: string; bold: boolean };

export function emptyPatch() {}
