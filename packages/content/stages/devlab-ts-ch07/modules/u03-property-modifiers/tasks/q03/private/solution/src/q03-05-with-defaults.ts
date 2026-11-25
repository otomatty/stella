// 問5 一部だけ指定した Partial<Options> を受け取り、足りないところを DEFAULT_OPTIONS で補った Options を返す
//     例: withDefaults({ size: 20 }) → { size: 20, color: "black", bold: false }
// 引数と戻り値に型注釈を付けます。

export type Options = { size: number; color: string; bold: boolean };

export const DEFAULT_OPTIONS: Options = { size: 12, color: "black", bold: false };

export function withDefaults(options: Partial<Options>): Options {
  return { ...DEFAULT_OPTIONS, ...options };
}
