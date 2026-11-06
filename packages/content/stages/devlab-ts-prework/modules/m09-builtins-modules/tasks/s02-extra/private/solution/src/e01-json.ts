export type User = { id: number; name: string; tags: string[] };
export type AppEvent = { title: string; at: Date };

function readJson(json: string): unknown {
  try {
    const data: unknown = JSON.parse(json);
    return data;
  } catch {
    throw new Error("JSON として読めません");
  }
}

function isUser(value: unknown): value is User {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  if (!("id" in value && "name" in value && "tags" in value)) {
    return false;
  }
  const { id, name, tags } = value;
  if (typeof id !== "number" || typeof name !== "string" || !Array.isArray(tags)) {
    return false;
  }
  const items: readonly unknown[] = tags;
  return items.every((tag) => typeof tag === "string");
}

export function parseUser(json: string): User {
  const data = readJson(json);
  if (!isUser(data)) {
    throw new Error("ユーザーの形が違います");
  }
  return data;
}

export function toJson(user: User): string {
  return JSON.stringify(user, null, 2);
}

export function parseEvent(json: string): AppEvent {
  const data = readJson(json);
  if (
    typeof data !== "object" ||
    data === null ||
    !("title" in data) ||
    !("at" in data) ||
    typeof data.title !== "string" ||
    typeof data.at !== "string"
  ) {
    throw new Error("イベントの形が違います");
  }
  const at = new Date(data.at);
  if (Number.isNaN(at.getTime())) {
    throw new Error("イベントの形が違います");
  }
  return { title: data.title, at };
}

export function eventToJson(event: AppEvent): string {
  return JSON.stringify(event);
}
