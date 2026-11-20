// 07-q01 typeof 型演算子 ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/typeof-type-operator
//       https://typescriptbook.jp/reference/type-reuse/indexed-access-types

export const ROLE_LABELS = { admin: "管理者", member: "一般" } as const;

// 問7
export type RoleLabels = typeof ROLE_LABELS;
