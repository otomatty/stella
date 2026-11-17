// 03-q06 インターセクション型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/intersection

export type Named = { name: string };

export type Priced = { price: number };

// 問7
export function makeItem(name: string, price: number): Named & Priced {
  return { name, price };
}
