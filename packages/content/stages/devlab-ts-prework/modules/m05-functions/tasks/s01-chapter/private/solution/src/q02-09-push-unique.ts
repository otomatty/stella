// 05-q02 引数と戻り値の型、void ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/function-parameters
//       https://typescriptbook.jp/reference/functions/void-type
//       https://typescriptbook.jp/reference/functions/pass-by-value

// 問9
export function pushUnique(items: string[], item: string): boolean {
  if (items.includes(item)) {
    return false;
  }
  items.push(item);
  return true;
}
