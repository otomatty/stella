// 08-q03 fetch ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous/await
//       https://developer.mozilla.org/ja/docs/Web/API/Fetch_API/Using_Fetch

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

// 問7
export async function getUserOrNull(id: number): Promise<User | null> {
  const res = await fetch(`${API}/users/${id}`);
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const data: unknown = await res.json();
  if (!isUser(data)) {
    throw new Error("ユーザーの形が違います");
  }
  return data;
}
