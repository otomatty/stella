// 問5 型 UserOrProductKey を、User と Product のどちらかのプロパティ名として作る（keyof User | keyof Product）

export type User = { id: number; name: string; email: string; age: number };

export type Product = { code: string; price: number; stock: number };

export type UserOrProductKey = keyof User | keyof Product;
