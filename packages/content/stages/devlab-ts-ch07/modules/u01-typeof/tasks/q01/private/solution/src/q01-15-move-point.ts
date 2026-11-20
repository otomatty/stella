// 07-q01 typeof 型演算子 ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/typeof-type-operator
//       https://typescriptbook.jp/reference/type-reuse/indexed-access-types

export const ORIGIN = { x: 0, y: 0 };

// 問15
export function movePoint(point: typeof ORIGIN, dx: number, dy: number): typeof ORIGIN {
  return { x: point.x + dx, y: point.y + dy };
}
