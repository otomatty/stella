// 問7 素数なら true（2 から順に、i × i が n 以下のあいだ割り切れるかを調べる）
//     例: isPrime(13) → true
// 引数と戻り値に型注釈を付けます。
// 繰り返しには while 文を使います。
export function isPrime(n: number): boolean {
  if (n < 2) {
    return false;
  }
  let i = 2;
  while (i * i <= n) {
    if (n % i === 0) {
      return false;
    }
    i++;
  }
  return true;
}
