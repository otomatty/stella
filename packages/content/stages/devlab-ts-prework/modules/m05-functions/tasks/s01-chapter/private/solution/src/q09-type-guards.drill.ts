export type User = { name: string; age: number };
export type Admin = User & { role: "admin" };
export type Pet = { kind: "dog"; bark: string } | { kind: "cat"; meow: string };

// 問1
export function isText(value: unknown): value is string {
  return typeof value === "string";
}

// 問2
export function isNum(value: unknown): value is number {
  return typeof value === "number" && !Number.isNaN(value);
}

// 問3
export function isBool(value: unknown): value is boolean {
  return typeof value === "boolean";
}

// 問4
export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

// 問5
export function isPresent(value: string | null): value is string {
  return value !== null;
}

// 問6
export function isDefinedNumber(value: number | undefined): value is number {
  return value !== undefined;
}

// 問7
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

// 問8
export function isAdmin(user: User | Admin): user is Admin {
  return "role" in user;
}

// 問9
export function isDog(pet: Pet): pet is { kind: "dog"; bark: string } {
  return pet.kind === "dog";
}

// 問10
export function isCat(pet: Pet): pet is { kind: "cat"; meow: string } {
  return pet.kind === "cat";
}

// 問11
export function onlyStrings(values: readonly unknown[]): string[] {
  return values.filter((value): value is string => typeof value === "string");
}

// 問12
export function definedOnly(values: readonly (number | undefined)[]): number[] {
  return values.filter((value): value is number => value !== undefined);
}

// 問13
export function countUsers(values: readonly unknown[]): number {
  const looksLikeUser = (value: unknown): value is User =>
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    "age" in value &&
    typeof value.name === "string" &&
    typeof value.age === "number";
  return values.filter(looksLikeUser).length;
}

// 問14
export function assertText(value: unknown): asserts value is string {
  if (typeof value !== "string") {
    throw new Error("文字列ではありません");
  }
}

// 問15
export function assertDefined(value: string | undefined): asserts value is string {
  if (value === undefined) {
    throw new Error("値がありません");
  }
}

// 問16
export function assertUser(value: unknown): asserts value is User {
  if (
    typeof value !== "object" ||
    value === null ||
    !("name" in value) ||
    !("age" in value) ||
    typeof value.name !== "string" ||
    typeof value.age !== "number"
  ) {
    throw new Error("User ではありません");
  }
}

// 問17
export function toUserOrNull(value: unknown): User | null {
  const looksLikeUser = (v: unknown): v is User =>
    typeof v === "object" &&
    v !== null &&
    "name" in v &&
    "age" in v &&
    typeof v.name === "string" &&
    typeof v.age === "number";
  return looksLikeUser(value) ? value : null;
}

// 問18
export function isEmailLike(value: unknown): value is string {
  return typeof value === "string" && value.includes("@");
}

// 問19
export function isPoint(value: unknown): value is { x: number; y: number } {
  return (
    typeof value === "object" &&
    value !== null &&
    "x" in value &&
    "y" in value &&
    typeof value.x === "number" &&
    typeof value.y === "number"
  );
}

// 問20
export function isColorName(value: string): value is "red" | "green" | "blue" {
  return value === "red" || value === "green" || value === "blue";
}
