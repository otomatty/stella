// 07-q01 typeof 型演算子 ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/typeof-type-operator
//       https://typescriptbook.jp/reference/type-reuse/indexed-access-types

export const TAGS = ["new", "sale"];

// 問11
export type Tag = (typeof TAGS)[number];
