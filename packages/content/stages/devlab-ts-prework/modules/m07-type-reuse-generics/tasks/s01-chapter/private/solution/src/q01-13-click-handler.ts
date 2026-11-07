// 07-q01 typeof 型演算子 ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/typeof-type-operator
//       https://typescriptbook.jp/reference/type-reuse/indexed-access-types

export function handleClick(x: number, y: number): string {
  return `${x},${y}`;
}

// 問13
export type ClickHandler = typeof handleClick;
