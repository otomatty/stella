// 問1
export function getName(user: { name: string; age: number }): string {
  return user.name;
}

// 問2
export function getAge(user: { name: string; age: number }): number {
  return user.age;
}

// 問3
export function makePoint(x: number, y: number): { x: number; y: number } {
  return { x, y };
}

// 問4
export function pointText(point: { x: number; y: number }): string {
  return `(${point.x}, ${point.y})`;
}

// 問5
export function makeUser(name: string, age: number): { name: string; age: number } {
  return { name, age };
}

// 問6
export function isAdultUser(user: { name: string; age: number }): boolean {
  return user.age >= 18;
}

// 問7
export function bookLabel(book: { title: string; price: number }): string {
  return `${book.title}（${book.price.toLocaleString("ja-JP")}円）`;
}

// 問8
export function makeBook(title: string, price: number): { title: string; price: number } {
  return { title, price };
}

// 問9
export function subtotal(line: { price: number; quantity: number }): number {
  return line.price * line.quantity;
}

// 問10
export function rectArea(rect: { width: number; height: number }): number {
  return rect.width * rect.height;
}

// 問11
export function makeRect(width: number, height: number): { width: number; height: number } {
  return { width, height };
}

// 問12
export function fullNameOf(person: { firstName: string; lastName: string }): string {
  return `${person.lastName} ${person.firstName}`;
}

// 問13
export function makePerson(
  firstName: string,
  lastName: string,
): { firstName: string; lastName: string } {
  return { firstName, lastName };
}

// 問14
export function measureText(measure: { value: number; unit: string }): string {
  return `${measure.value}${measure.unit}`;
}

// 問15
export function isSameName(a: { name: string }, b: { name: string }): boolean {
  return a.name === b.name;
}

// 問16
export function scoreTotal(score: { math: number; english: number; science: number }): number {
  return score.math + score.english + score.science;
}

// 問17
export function makeScore(
  math: number,
  english: number,
  science: number,
): { math: number; english: number; science: number } {
  return { math, english, science };
}

// 問18
export function colorText(color: { r: number; g: number; b: number }): string {
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

// 問19
export function makeColor(r: number, g: number, b: number): { r: number; g: number; b: number } {
  return { r, g, b };
}

// 問20
export function middleOf(range: { start: number; end: number }): number {
  return (range.start + range.end) / 2;
}
