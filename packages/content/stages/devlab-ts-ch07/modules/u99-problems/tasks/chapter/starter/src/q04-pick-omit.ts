// 07-q04 Pick と Omit
//
// 教材: https://typescriptbook.jp/reference/type-reuse/utility-types/pick
//       https://typescriptbook.jp/reference/type-reuse/utility-types/omit
//
// 問題
//   Pick<T, "a" | "b">: T から、指定したプロパティだけを取り出した型
//   Omit<T, "a" | "b">: T から、指定したプロパティを除いた型
// 型 User は定義済みです。次の型と関数を書いて export してください。
//
// 1. 型 PublicUser: User から password を除いた型（Omit）
//    toPublic(user): PublicUser を返す。返すオブジェクトに password を含めないこと
//
// 2. 型 UserSummary: User から id と name だけを取り出した型（Pick）
//    toSummary(user): UserSummary を返す
//
// 3. 型 NewUser: User から id と createdAt を除いた型
//    createUser(input, id, createdAt): NewUser に id と createdAt を足した User を返す
//
// 4. 型 UserUpdate: User の name と email だけを、どちらも省略できるようにした型（Partial と Pick を組み合わせる）
//    applyUpdate(user, update): 上書きした新しい User を返す

export type User = {
  id: number;
  name: string;
  email: string;
  password: string;
  createdAt: Date;
};

export type PublicUser = unknown;
export type UserSummary = unknown;
export type NewUser = unknown;
export type UserUpdate = unknown;

export function toPublic() {}

export function toSummary() {}

export function createUser() {}

export function applyUpdate() {}
