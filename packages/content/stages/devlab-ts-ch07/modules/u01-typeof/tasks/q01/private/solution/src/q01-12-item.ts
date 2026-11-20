// 07-q01 typeof 型演算子 ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/typeof-type-operator
//       https://typescriptbook.jp/reference/type-reuse/indexed-access-types

export function makeItem(name: string, price: number) {
  return { name, price, createdAt: 0 };
}

// 問12
export type Item = ReturnType<typeof makeItem>;
