export type Item = { id: number; name: string; price: number; stock: number };
export type User = { id: number; name: string; age: number; email: string };

// 問1
export function itemLabel(item: Item): string {
  const { name, price } = item;
  return `${name} ${price}円`;
}

// 問2
export function setPrice(item: Item, price: number): Item {
  return { ...item, price };
}

// 問3
export function setStock(item: Item, stock: number): Item {
  return { ...item, stock };
}

// 問4
export function addStock(item: Item, amount: number): Item {
  return { ...item, stock: item.stock + amount };
}

// 問5
export function rename(item: Item, name: string): Item {
  return { ...item, name };
}

// 問6
export function userSummary(user: User): string {
  const { name, age } = user;
  return `${name}（${age}）`;
}

// 問7
export function birthday(user: User): User {
  return { ...user, age: user.age + 1 };
}

// 問8
export function changeEmail(user: User, email: string): User {
  return { ...user, email };
}

// 問9
export function pickIdName(user: User): { id: number; name: string } {
  const { id, name } = user;
  return { id, name };
}

// 問10
export function mergeUser(user: User, patch: { name: string; email: string }): User {
  return { ...user, ...patch };
}

// 問11
export function copyItem(item: Item): Item {
  return { ...item };
}

// 問12
export function discountItem(item: Item, percentOff: number): Item {
  return { ...item, price: Math.floor((item.price * (100 - percentOff)) / 100) };
}

// 問13
export function greetByName({ name }: User): string {
  return `こんにちは、${name}さん`;
}

// 問14
export function isExpensive({ price }: Item): boolean {
  return price >= 1000;
}

// 問15
export function stockValue({ price, stock }: Item): number {
  return price * stock;
}

// 問16
export function resetStock(item: Item): Item {
  return { ...item, stock: 0 };
}

// 問17
export function toOption(item: Item): { value: number; label: string } {
  const { id: value, name: label } = item;
  return { value, label };
}

// 問18
export function withDefaults(options: { size?: number; color?: string }): {
  size: number;
  color: string;
} {
  return { size: 10, color: "black", ...options };
}

// 問19
export function combine(a: { x: number }, b: { y: number }): { x: number; y: number } {
  return { ...a, ...b };
}

// 問20
export function withTax(item: Item): Item {
  return { ...item, price: Math.floor((item.price * 110) / 100) };
}
