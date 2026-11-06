export type User = { id: number; name: string; email: string; age: number };

export type UserKey = keyof User;

export function getField(user: User, key: UserKey): string | number {
  return user[key];
}

export function fieldsText(user: User, keys: readonly UserKey[]): string {
  return keys.map((key) => `${key}=${user[key]}`).join(", ");
}

export function sortUsers(users: readonly User[], key: UserKey): User[] {
  return [...users].sort((a, b) => {
    const x = a[key];
    const y = b[key];
    if (typeof x === "number" && typeof y === "number") {
      return x - y;
    }
    return String(x).localeCompare(String(y));
  });
}

const USER_KEYS: readonly UserKey[] = ["id", "name", "email", "age"];

export function isUserKey(text: string): text is UserKey {
  return USER_KEYS.some((key) => key === text);
}
