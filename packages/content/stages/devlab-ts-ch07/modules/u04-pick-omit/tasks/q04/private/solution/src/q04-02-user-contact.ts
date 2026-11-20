// 07-q04 Pick と Omit ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/utility-types/pick
//       https://typescriptbook.jp/reference/type-reuse/utility-types/omit

export type User = { id: number; name: string; email: string; password: string; age: number };

// 問2
export type UserContact = Pick<User, "name" | "email">;
