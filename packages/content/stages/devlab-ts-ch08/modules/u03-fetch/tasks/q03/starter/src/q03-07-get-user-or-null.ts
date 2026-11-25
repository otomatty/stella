// 問7 `${API}/users/${id}` を取得する。404 なら null、ok なら User（形が違えば "ユーザーの形が違います" の Error）、それ以外は `HTTP 500` の Error
//     例: getUserOrNull(9) → 404 なら null で解決する
// fetch と async・await を使ってください。
// res.json() の結果を unknown 型の変数に入れ、形を確かめてから使ってください。
// ユーザーの形は定義済みの isUser で確かめてください。
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

export function getUserOrNull() {}
