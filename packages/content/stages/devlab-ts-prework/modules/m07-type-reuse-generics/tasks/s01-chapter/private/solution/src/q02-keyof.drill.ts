export type User = { id: number; name: string; email: string; age: number };
export type Product = { code: string; price: number; stock: number };
export const SETTINGS = { theme: "light", fontSize: 14, beta: false };
export const COLOR_CODES = { red: "#ff0000", green: "#00ff00", blue: "#0000ff" } as const;

// 問1
export type UserKey = keyof User;

// 問2
export type ProductKey = keyof Product;

// 問3
export type SettingKey = keyof typeof SETTINGS;

// 問4
export type ColorName = keyof typeof COLOR_CODES;

// 問5
export type UserOrProductKey = keyof User | keyof Product;

// 問6
export type UserValue = User[keyof User];

// 問7
export function userField(user: User, key: keyof User): string | number {
  return user[key];
}

// 問8
export function productField(product: Product, key: keyof Product): string | number {
  return product[key];
}

// 問9
export function settingValue(key: keyof typeof SETTINGS): string | number | boolean {
  return SETTINGS[key];
}

// 問10
export function colorCode(name: keyof typeof COLOR_CODES): string {
  return COLOR_CODES[name];
}

// 問11
export function fieldLabel(key: keyof User): string {
  switch (key) {
    case "id":
      return "ID";
    case "name":
      return "名前";
    case "email":
      return "メール";
    case "age":
      return "年齢";
  }
}

// 問12
const USER_KEYS: readonly (keyof User)[] = ["id", "name", "email", "age"];

export function isUserKey(text: string): text is keyof User {
  return USER_KEYS.some((key) => key === text);
}

// 問13
export function valuesOf(user: User, keys: readonly (keyof User)[]): (string | number)[] {
  return keys.map((key) => user[key]);
}

// 問14
export function differentKeys(a: User, b: User): (keyof User)[] {
  const keys: (keyof User)[] = ["id", "name", "email", "age"];
  return keys.filter((key) => a[key] !== b[key]);
}

// 問15
export function sortByNumberKey(users: readonly User[], key: "id" | "age"): User[] {
  return [...users].sort((a, b) => a[key] - b[key]);
}

// 問16
export function keyCount(obj: object): number {
  return Object.keys(obj).length;
}

// 問17
export function hasOwnKey(obj: object, key: string): boolean {
  return key in obj;
}

// 問18
export function productText(product: Product, keys: readonly (keyof Product)[]): string {
  return keys.map((key) => `${key}=${product[key]}`).join(", ");
}

// 問19
export type UserLabels = Record<keyof User, string>;

export const USER_LABELS: UserLabels = { id: "ID", name: "名前", email: "メール", age: "年齢" };

// 問20
export function totalStock(products: readonly Product[], key: "price" | "stock"): number {
  let total = 0;
  for (const product of products) {
    total += product[key];
  }
  return total;
}
