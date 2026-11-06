// 問1
export function greetUser(user: { name: string; nickname?: string }): string {
  return `こんにちは、${user.nickname ?? user.name}さん`;
}

// 問2
export function hasEmail(user: { email?: string }): boolean {
  return user.email !== undefined;
}

// 問3
export function emailText(user: { email?: string }): string {
  return user.email ?? "（未登録）";
}

// 問4
export function ageText(person: { age?: number }): string {
  return person.age === undefined ? "年齢不明" : `${person.age}歳`;
}

// 問5
export function colorOf(options: { color?: string }): string {
  return options.color ?? "black";
}

// 問6
export function perPageOf(options: { perPage?: number }): number {
  return options.perPage ?? 20;
}

// 問7
export function createTodo(
  id: number,
  title: string,
): { readonly id: number; title: string; done: boolean } {
  return { id, title, done: false };
}

// 問8
export function completeTodo(todo: { readonly id: number; title: string; done: boolean }): {
  readonly id: number;
  title: string;
  done: boolean;
} {
  return { ...todo, done: true };
}

// 問9
export function nameWithMiddle(name: { first: string; middle?: string; last: string }): string {
  if (name.middle === undefined) {
    return `${name.first} ${name.last}`;
  }
  return `${name.first} ${name.middle} ${name.last}`;
}

// 問10
export function isComplete(profile: { name?: string; email?: string }): boolean {
  return profile.name !== undefined && profile.email !== undefined;
}

// 問11
export function countFilled(form: { a?: string; b?: string; c?: string }): number {
  let count = 0;
  if (form.a !== undefined) {
    count++;
  }
  if (form.b !== undefined) {
    count++;
  }
  if (form.c !== undefined) {
    count++;
  }
  return count;
}

// 問12
export function payAmount(order: { price: number; coupon?: number }): number {
  return order.price - (order.coupon ?? 0);
}

// 問13
export function addressText(address: { city: string; building?: string }): string {
  return address.building === undefined ? address.city : `${address.city} ${address.building}`;
}

// 問14
export function frozenPoint(x: number, y: number): { readonly x: number; readonly y: number } {
  return { x, y };
}

// 問15
export function moveRight(point: { readonly x: number; readonly y: number }): {
  readonly x: number;
  readonly y: number;
} {
  return { x: point.x + 1, y: point.y };
}

// 問16
export function titleText(book: { title: string; subtitle?: string }): string {
  return book.subtitle === undefined ? book.title : `${book.title}: ${book.subtitle}`;
}

// 問17
export function timeoutMs(options: { timeoutSeconds?: number }): number {
  return (options.timeoutSeconds ?? 30) * 1000;
}

// 問18
export function isGuest(user: { name: string; memberId?: number }): boolean {
  return user.memberId === undefined;
}

// 問19
export function labelOf(item: { id: number; label?: string }): string {
  return item.label ?? `#${item.id}`;
}

// 問20
export function settingText(setting: { readonly darkMode: boolean; fontSize?: number }): string {
  return `${setting.darkMode ? "ダーク" : "ライト"} / ${setting.fontSize ?? 16}px`;
}
