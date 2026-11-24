// 問6 `${API}/users/${id}` を取得し、isUser で確かめて User を返す。形が違えば "ユーザーの形が違います"、ok でなければ `HTTP 404` の Error
//     例: getUser(1) → { id: 1, name: "山田" } で解決する
// fetch と async・await を使ってください。
// res.json() の結果を unknown 型の変数に入れ、形を確かめてから使ってください。
// HTTP エラーのメッセージには実際の res.status を入れてください。

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

export async function getUser(id: number): Promise<User> {
  const res = await fetch(`${API}/users/${id}`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const data: unknown = await res.json();
  if (!isUser(data)) {
    throw new Error("ユーザーの形が違います");
  }
  return data;
}
