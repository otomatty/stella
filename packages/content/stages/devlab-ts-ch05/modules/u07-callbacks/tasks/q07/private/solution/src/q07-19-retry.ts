// 問19 fn が true を返すまで、最大 times 回呼ぶ。fn には1から数えた回数を渡す。成功すれば true、すべて失敗すれば false
//     例: retry(3, (attempt) => attempt === 2) → true
// 引数と戻り値には型注釈を付けてください。
// コールバックの型は (n: number) => number のように書いてください。
// for で回数を数えながら、コールバックを直接呼んでください。

export function retry(times: number, fn: (attempt: number) => boolean): boolean {
  for (let attempt = 1; attempt <= times; attempt++) {
    if (fn(attempt)) {
      return true;
    }
  }
  return false;
}
