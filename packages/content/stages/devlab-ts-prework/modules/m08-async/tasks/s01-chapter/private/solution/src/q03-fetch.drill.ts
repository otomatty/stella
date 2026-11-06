export const API = "https://api.example.com";

export type User = { id: number; name: string };
export type Todo = { id: number; title: string; done: boolean };

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

export function isTodo(value: unknown): value is Todo {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "number" &&
    "title" in value &&
    typeof value.title === "string" &&
    "done" in value &&
    typeof value.done === "boolean"
  );
}

// 問1
export async function getStatus(url: string): Promise<number> {
  const res = await fetch(url);
  return res.status;
}

// 問2
export async function isOk(url: string): Promise<boolean> {
  const res = await fetch(url);
  return res.ok;
}

// 問3
export async function getText(url: string): Promise<string> {
  const res = await fetch(url);
  return await res.text();
}

// 問4
export async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  const data: unknown = await res.json();
  return data;
}

// 問5
export async function getJsonOrThrow(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const data: unknown = await res.json();
  return data;
}

// 問6
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

// 問8
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

// 問9
export async function getTodoTitles(): Promise<string[]> {
  const res = await fetch(`${API}/todos`);
  const data: unknown = await res.json();
  if (!Array.isArray(data)) {
    throw new Error("TODO の形が違います");
  }
  const items: readonly unknown[] = data;
  if (!items.every(isTodo)) {
    throw new Error("TODO の形が違います");
  }
  return items.map((todo) => todo.title);
}

// 問10
export async function countDone(): Promise<number> {
  const res = await fetch(`${API}/todos`);
  const data: unknown = await res.json();
  if (!Array.isArray(data)) {
    throw new Error("TODO の形が違います");
  }
  const items: readonly unknown[] = data;
  if (!items.every(isTodo)) {
    throw new Error("TODO の形が違います");
  }
  return items.filter((todo) => todo.done).length;
}

// 問11
export async function searchUsers(keyword: string): Promise<User[]> {
  const res = await fetch(`${API}/users?q=${encodeURIComponent(keyword)}`);
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

// 問12
export async function getTodosPage(page: number, perPage: number): Promise<Todo[]> {
  const query = new URLSearchParams({ page: String(page), per_page: String(perPage) });
  const res = await fetch(`${API}/todos?${query.toString()}`);
  const data: unknown = await res.json();
  if (!Array.isArray(data)) {
    throw new Error("TODO の形が違います");
  }
  const items: readonly unknown[] = data;
  if (!items.every(isTodo)) {
    throw new Error("TODO の形が違います");
  }
  return [...items];
}

// 問13
export async function postJson(url: string, body: unknown): Promise<number> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.status;
}

// 問14
export async function createTodo(title: string): Promise<Todo> {
  const res = await fetch(`${API}/todos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, done: false }),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const data: unknown = await res.json();
  if (!isTodo(data)) {
    throw new Error("TODO の形が違います");
  }
  return data;
}

// 問15
export async function updateTodo(id: number, done: boolean): Promise<boolean> {
  const res = await fetch(`${API}/todos/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ done }),
  });
  return res.ok;
}

// 問16
export async function deleteTodo(id: number): Promise<boolean> {
  const res = await fetch(`${API}/todos/${id}`, { method: "DELETE" });
  return res.ok;
}

// 問17
export async function getWithToken(url: string, token: string): Promise<string> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  return await res.text();
}

// 問18
export async function getAllTexts(urls: readonly string[]): Promise<string[]> {
  const responses = await Promise.all(urls.map((url) => fetch(url)));
  return await Promise.all(responses.map((res) => res.text()));
}

// 問19
export async function getFirstOk(urls: readonly string[]): Promise<string> {
  for (const url of urls) {
    const res = await fetch(url);
    if (res.ok) {
      return await res.text();
    }
  }
  throw new Error("取得できませんでした");
}

// 問20
export async function getJsonSafe(url: string): Promise<unknown> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      return undefined;
    }
    const data: unknown = await res.json();
    return data;
  } catch {
    return undefined;
  }
}
