// 問11 `${API}/users?q=キーワード` を取得し、User の配列を返す。キーワードは encodeURIComponent で変換する。形が違えば "ユーザーの形が違います" の Error
//     例: searchUsers("山田") → `${API}/users?q=%E5%B1%B1%E7%94%B0` を取得する
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

export function searchUsers() {}
