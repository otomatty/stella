// 問3 型 SafeUser を、User から password を除いて作る
// プロパティを手で書き並べず、Omit で型を作ります。

export type User = { id: number; name: string; email: string; password: string; age: number };

export type SafeUser = Omit<User, "password">;
