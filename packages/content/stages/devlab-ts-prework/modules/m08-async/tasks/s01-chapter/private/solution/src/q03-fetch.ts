export const API_URL = "https://api.example.com";

export type User = { id: number; name: string };
export type NewPost = { userId: number; title: string };

export async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const data: unknown = await res.json();
  return data;
}

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
  const data = await getJson(`${API_URL}/users/${id}`);
  if (!isUser(data)) {
    throw new Error("ユーザーの形が違います");
  }
  return data;
}

export async function searchUsers(keyword: string): Promise<User[]> {
  const data = await getJson(`${API_URL}/users?q=${encodeURIComponent(keyword)}`);
  if (!Array.isArray(data)) {
    throw new Error("ユーザーの形が違います");
  }
  const items: readonly unknown[] = data;
  const users = items.filter(isUser);
  if (users.length !== items.length) {
    throw new Error("ユーザーの形が違います");
  }
  return users;
}

export async function createPost(post: NewPost): Promise<number> {
  const res = await fetch(`${API_URL}/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(post),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const data: unknown = await res.json();
  if (typeof data !== "object" || data === null || !("id" in data) || typeof data.id !== "number") {
    throw new Error("投稿の形が違います");
  }
  return data.id;
}
