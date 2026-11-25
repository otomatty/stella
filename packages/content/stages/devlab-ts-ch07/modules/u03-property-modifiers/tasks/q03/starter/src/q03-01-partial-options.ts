// 問1 型 PartialOptions を Options から作る（すべて省略できる）
// プロパティを手で書き並べず、Partial<Options> で作ります。

export type Options = { size: number; color: string; bold: boolean };

// ここに型 PartialOptions を書く
