// 問1 型 UserKey を keyof User で作る

export type User = { id: number; name: string; email: string; age: number };

export type UserKey = keyof User;
