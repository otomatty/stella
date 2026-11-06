export type User = { name: string; age: number };

export function isString(value: unknown): value is string {
  return typeof value === "string";
}

export function isUser(value: unknown): value is User {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    "age" in value &&
    typeof value.name === "string" &&
    typeof value.age === "number"
  );
}

export function isUserArray(value: unknown): value is User[] {
  return Array.isArray(value) && value.every((item) => isUser(item));
}

export function assertIsUser(value: unknown): asserts value is User {
  if (!isUser(value)) {
    throw new Error("User ではありません");
  }
}

export function parseUsers(json: string): User[] {
  const data: unknown = JSON.parse(json);
  if (!isUserArray(data)) {
    throw new Error("User の配列ではありません");
  }
  return data;
}
