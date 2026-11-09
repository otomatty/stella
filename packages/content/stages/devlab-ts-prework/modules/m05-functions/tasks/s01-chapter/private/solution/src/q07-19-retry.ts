// 05-q07 コールバック関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/callback-functions
//       https://typescriptbook.jp/reference/functions/function-type-declaration

// 問19
export function retry(times: number, fn: (attempt: number) => boolean): boolean {
  for (let attempt = 1; attempt <= times; attempt++) {
    if (fn(attempt)) {
      return true;
    }
  }
  return false;
}
