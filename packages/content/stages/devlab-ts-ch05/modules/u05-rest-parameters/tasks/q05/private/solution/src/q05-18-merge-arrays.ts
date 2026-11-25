// 問18 いくつかの配列を受け取り、1つにつないだ配列を返す
//     例: mergeArrays([1, 2], [3], []) → [1, 2, 3]
// 引数と戻り値には型注釈を付けてください。
// 個数が決まっていない引数は、...numbers: number[] のような残余引数で受け取ってください。

export function mergeArrays(...arrays: (readonly number[])[]): number[] {
  const result: number[] = [];
  for (const array of arrays) {
    result.push(...array);
  }
  return result;
}
