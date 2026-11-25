// 問2 型 UserContact を、User から name と email を取り出して作る
// プロパティを手で書き並べず、Pick で型を作ります。

export type User = { id: number; name: string; email: string; password: string; age: number };

export type UserContact = Pick<User, "name" | "email">;
