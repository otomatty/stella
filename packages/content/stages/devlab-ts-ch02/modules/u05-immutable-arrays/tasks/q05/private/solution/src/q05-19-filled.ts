// 問19 value を length 個並べた新しい配列を返す
//     例: filled(3, 0) → [0, 0, 0]
// 引数と戻り値には型注釈を付けます。
export function filled(length: number, value: number): number[] {
  return Array.from({ length }, () => value);
}
