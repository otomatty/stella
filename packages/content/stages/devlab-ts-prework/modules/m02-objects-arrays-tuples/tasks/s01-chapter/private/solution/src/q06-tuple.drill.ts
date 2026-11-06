// 問1
export function makePair(name: string, count: number): [string, number] {
  return [name, count];
}

// 問2
export function flipPair(pair: [number, string]): [string, number] {
  const [count, name] = pair;
  return [name, count];
}

// 問3
export function nameOf(pair: [string, number]): string {
  return pair[0];
}

// 問4
export function countOf(pair: [string, number]): number {
  return pair[1];
}

// 問5
export function addPoints(a: [number, number], b: [number, number]): [number, number] {
  const [x1, y1] = a;
  const [x2, y2] = b;
  return [x1 + x2, y1 + y2];
}

// 問6
export function scalePoint(point: [number, number], k: number): [number, number] {
  const [x, y] = point;
  return [x * k, y * k];
}

// 問7
export function distanceFromOrigin(point: [number, number]): number {
  const [x, y] = point;
  return Math.hypot(x, y);
}

// 問8
export function toPoint(x: number, y: number): [number, number] {
  return [x, y];
}

// 問9
export function pointText([x, y]: [number, number]): string {
  return `(${x}, ${y})`;
}

// 問10
export function rgbText(color: [number, number, number]): string {
  const [r, g, b] = color;
  return `rgb(${r}, ${g}, ${b})`;
}

// 問11
export function divmod(a: number, b: number): [number, number] {
  return [Math.floor(a / b), a % b];
}

// 問12
export function splitName(fullName: string): [string, string] {
  const [last = "", first = ""] = fullName.split(" ");
  return [last, first];
}

// 問13
export function order2(a: number, b: number): [number, number] {
  return a <= b ? [a, b] : [b, a];
}

// 問14
export function headTail(items: readonly string[]): [string | undefined, string[]] {
  return [items[0], items.slice(1)];
}

// 問15
export function expandRange(range: [number, number]): number[] {
  const [start, end] = range;
  const result: number[] = [];
  for (let i = start; i <= end; i++) {
    result.push(i);
  }
  return result;
}

// 問16
export function isOrigin(point: [number, number]): boolean {
  const [x, y] = point;
  return x === 0 && y === 0;
}

// 問17
export function entryText([name, count]: [string, number]): string {
  return `${name} × ${count}`;
}

// 問18
export function sumPair([a, b]: [number, number]): number {
  return a + b;
}

// 問19
export function swapXY([x, y]: [number, number]): [number, number] {
  return [y, x];
}

// 問20
export function withIndex(items: readonly string[]): [number, string][] {
  return items.map((item, i): [number, string] => [i, item]);
}
