// 問20 options の、keys に並べたプロパティだけを DEFAULT_OPTIONS の値に戻した新しい Options を返す。keys は readonly (keyof Options)[]
//     例: resetKeys({ size: 20, color: "red", bold: true }, ["size"]) → { size: 12, color: "red", bold: true }
// 引数と戻り値に型注釈を付けます。

export type Options = { size: number; color: string; bold: boolean };

export const DEFAULT_OPTIONS: Options = { size: 12, color: "black", bold: false };

export function resetKeys() {}
