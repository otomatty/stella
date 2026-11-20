// 07-q02 keyof 型演算子 ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/keyof-type-operator
//       https://typescriptbook.jp/reference/type-reuse/indexed-access-types

export type User = { id: number; name: string; email: string; age: number };

// 問19
export type UserLabels = Record<keyof User, string>;

export const USER_LABELS: UserLabels = { id: "ID", name: "名前", email: "メール", age: "年齢" };
