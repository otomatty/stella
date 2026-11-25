// 問3 型 ReadonlyOptions を Options から作る（すべて読み取り専用）
// プロパティを手で書き並べず、Readonly<Options> で作ります。

export type Options = { size: number; color: string; bold: boolean };

export type ReadonlyOptions = Readonly<Options>;
