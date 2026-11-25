// 問8 `${API}/users` を取得し、User の配列を返す。配列でない、または User でない要素があれば "ユーザーの形が違います" の Error
//     例: getUsers() → [{ id: 1, name: "山田" }] で解決する
// fetch と async・await を使ってください。
// res.json() の結果を unknown 型の変数に入れ、形を確かめてから使ってください。
// ユーザーの形は定義済みの isUser で確かめてください。

export const API = "https://api.example.com";

export type User = { id: number; name: string };

export function isUser(value: unknown): value is User {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "number" &&
    "name" in value &&
    typeof value.name === "string"
  );
}

export async function getUsers(): Promise<User[]> {
  const res = await fetch(`${API}/users`);
  const data: unknown = await res.json();
  if (!Array.isArray(data)) {
    throw new Error("ユーザーの形が違います");
  }
  const items: readonly unknown[] = data;
  if (!items.every(isUser)) {
    throw new Error("ユーザーの形が違います");
  }
  return [...items];
}
