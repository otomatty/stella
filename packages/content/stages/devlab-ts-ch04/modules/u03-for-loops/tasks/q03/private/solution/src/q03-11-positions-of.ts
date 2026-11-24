// 問11 char が出てくる位置（0から数える）を並べた配列を返す
//     例: positionsOf("banana", "a") → [1, 3, 5]
// 引数と戻り値に型注釈を付けます。
// 番号も使うところは for 文か for-of 文で回します。map や filter などでループを置き換えないでください。
export function positionsOf(text: string, char: string): number[] {
  const result: number[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === char) {
      result.push(i);
    }
  }
  return result;
}
