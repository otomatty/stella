// 問1
export function lengthOrZero(text: string | undefined): number {
  return text?.length ?? 0;
}

// 問2
export function upperOrEmpty(text: string | null): string {
  return text?.toUpperCase() ?? "";
}

// 問3
export function orDefault(value: number | undefined, fallback: number): number {
  return value ?? fallback;
}

// 問4
export function nameOrGuest(name: string | null): string {
  return name ?? "ゲスト";
}

// 問5
export function firstLetter(text: string | undefined): string | undefined {
  return text?.[0];
}

// 問6
export function cityOf(user: { address?: { city: string } }): string | undefined {
  return user.address?.city;
}

// 問7
export function cityOrUnknown(user: { address?: { city: string } }): string {
  return user.address?.city ?? "不明";
}

// 問8
export function emptyToNull(text: string): string | null {
  return text === "" ? null : text;
}

// 問9
export function indexOrNull(items: readonly string[], target: string): number | null {
  const index = items.indexOf(target);
  return index === -1 ? null : index;
}

// 問10
export function parseOrNull(text: string): number | null {
  const value = Number(text);
  return Number.isNaN(value) ? null : value;
}

// 問11
export function isMissing(value: string | null | undefined): boolean {
  return value === null || value === undefined;
}

// 問12
export function countPresent(values: readonly (string | undefined)[]): number {
  return values.filter((value) => value !== undefined).length;
}

// 問13
export function sumNonNull(values: readonly (number | null)[]): number {
  let total = 0;
  for (const value of values) {
    if (value !== null) {
      total += value;
    }
  }
  return total;
}

// 問14
export function phoneText(contact: { phone?: string | null }): string {
  return contact.phone ?? "なし";
}

// 問15
export function managerName(team: { manager: { name: string } | null }): string {
  return team.manager?.name ?? "未定";
}

// 問16
export function nullToUndefined(value: string | null): string | undefined {
  return value ?? undefined;
}

// 問17
export function undefinedToNull(value: string | undefined): string | null {
  return value ?? null;
}

// 問18
export function bothPresent(a: string | null, b: string | null): boolean {
  return a !== null && b !== null;
}

// 問19
export function joinPresent(a: string | null, b: string | null): string {
  if (a === null) {
    return b ?? "";
  }
  if (b === null) {
    return a;
  }
  return `${a} ${b}`;
}

// 問20
export function lastLoginText(user: { lastLoginAt: Date | null }): string {
  return user.lastLoginAt?.toISOString().slice(0, 10) ?? "未ログイン";
}
