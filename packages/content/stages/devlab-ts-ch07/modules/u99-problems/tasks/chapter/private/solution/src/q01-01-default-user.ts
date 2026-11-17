// 07-q01 typeof 型演算子 ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/typeof-type-operator
//       https://typescriptbook.jp/reference/type-reuse/indexed-access-types

export const DEFAULT_USER = { name: "ゲスト", age: 0, admin: false };

// 問1
export type DefaultUser = typeof DEFAULT_USER;
