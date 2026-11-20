// 05-q05 残余引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/rest-parameters

// 問16
export function pushAll(target: number[], ...values: number[]): number {
  return target.push(...values);
}
