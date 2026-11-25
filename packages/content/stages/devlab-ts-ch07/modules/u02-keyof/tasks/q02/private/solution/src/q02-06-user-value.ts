// 問6 型 UserValue を、User のすべてのプロパティの値の型のユニオン型として作る（User[keyof User]）

export type User = { id: number; name: string; email: string; age: number };

export type UserValue = User[keyof User];
