// 問題
// keyof 型 と書くと、その型のプロパティ名のユニオン型になります。型 User は定義済みです。
//
// 1. 型 UserKey を keyof で作って export する（"id" | "name" | "email" | "age" になる）
//
// 2. getField(user, key) を書く。key は UserKey。user のそのプロパティの値を返す。戻り値は string | number
//
// 3. fieldsText(user, keys) を書く。keys は readonly UserKey[]。"name=山田, age=30" の形にする
//
// 4. sortUsers(users, key) を書く。key のプロパティの値で、小さい順（文字列は辞書順）に並べた新しい配列を返す。
//    引数の配列は readonly User[]。同じ値なら元の順
//
// 5. isUserKey(text) を書く。UserKey のどれかなら true。戻り値の型は text is UserKey
// 引数と戻り値に型注釈を付けます。

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
