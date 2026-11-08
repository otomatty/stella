// 07-q03 Partial・Required・Readonly ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/utility-types/partial
//       https://typescriptbook.jp/reference/type-reuse/utility-types/required
//       https://typescriptbook.jp/reference/type-reuse/utility-types/readonly
//
// 型 Options と Profile は定義済みです。
// Partial<T> はすべてを省略できる型、Required<T> はすべてを省略できない型、Readonly<T> はすべてを読み取り専用にした型。
// 型を書く問題は、プロパティを手で書き並べず、ユーティリティ型で作ること。関数は引数と戻り値に型注釈を付けること。

export type Options = { size: number; color: string; bold: boolean };

// 問17 Readonly<Options> を "12px black" の形にする。bold が true なら後ろに " 太字" を付ける
//     例: describeOptions({ size: 12, color: "black", bold: true }) → "12px black 太字"
export function describeOptions() {}
