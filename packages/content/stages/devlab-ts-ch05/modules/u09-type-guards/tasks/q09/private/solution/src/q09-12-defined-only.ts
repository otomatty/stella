// 問12 (number | undefined)[] から undefined を除いた number[] を返す
//     例: definedOnly([1, undefined, 2]) → [1, 2]
// 型ガード関数を使い、戻り値の型は value is number と書いてください。

export function definedOnly(values: readonly (number | undefined)[]): number[] {
  return values.filter((value): value is number => value !== undefined);
}
