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

// 問15 Readonly<Options> を受け取り、bold を反転した新しい Options を返す
//     例: toggleBold({ size: 12, color: "black", bold: false }).bold → true
export function toggleBold() {}
