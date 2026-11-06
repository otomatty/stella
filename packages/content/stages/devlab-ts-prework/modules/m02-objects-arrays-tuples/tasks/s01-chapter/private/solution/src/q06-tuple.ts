export type Point = [number, number];

export function distance(a: Point, b: Point): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

export function midpoint(a: Point, b: Point): Point {
  const [x1, y1] = a;
  const [x2, y2] = b;
  return [(x1 + x2) / 2, (y1 + y2) / 2];
}

// 注釈がないと、戻り値は number[] に推論される
export function minMax(numbers: readonly number[]): [number, number] {
  if (numbers.length === 0) {
    throw new Error("空の配列です");
  }
  return [Math.min(...numbers), Math.max(...numbers)];
}
