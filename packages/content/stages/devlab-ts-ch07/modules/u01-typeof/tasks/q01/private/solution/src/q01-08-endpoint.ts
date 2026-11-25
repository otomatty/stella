// 問8 型 Endpoint を、ENDPOINTS のすべての値のユニオン型として作る（(typeof ENDPOINTS)[keyof typeof ENDPOINTS]）
// 定義済みの定数は書き換えません。

export const ENDPOINTS = { users: "/api/users", rooms: "/api/rooms" } as const;

export type Endpoint = (typeof ENDPOINTS)[keyof typeof ENDPOINTS];
