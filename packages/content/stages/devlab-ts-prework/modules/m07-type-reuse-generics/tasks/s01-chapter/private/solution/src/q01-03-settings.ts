// 07-q01 typeof 型演算子 ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/typeof-type-operator
//       https://typescriptbook.jp/reference/type-reuse/indexed-access-types

export const SETTINGS = {
  theme: "light",
  fontSize: 14,
  notifications: { email: true, push: false },
};

// 問3
export type Settings = typeof SETTINGS;
