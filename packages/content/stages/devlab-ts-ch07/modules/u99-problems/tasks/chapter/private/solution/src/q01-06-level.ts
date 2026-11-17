// 07-q01 typeof 型演算子 ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/typeof-type-operator
//       https://typescriptbook.jp/reference/type-reuse/indexed-access-types

export const LEVELS = [1, 2, 3] as const;

// 問6
export type Level = (typeof LEVELS)[number];
