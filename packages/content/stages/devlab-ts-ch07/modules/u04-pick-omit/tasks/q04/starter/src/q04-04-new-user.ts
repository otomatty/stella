// 問4 型 NewUser を、User から id を除いて作る
// プロパティを手で書き並べず、Omit で型を作ります。

export type User = { id: number; name: string; email: string; password: string; age: number };

// ここに型 NewUser を書く
