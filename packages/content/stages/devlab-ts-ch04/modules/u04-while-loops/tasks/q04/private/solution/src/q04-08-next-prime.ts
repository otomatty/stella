// 問8 n より大きい、最小の素数を返す
//     例: nextPrime(13) → 17
// 引数と戻り値に型注釈を付けます。
// 次の素数の候補は while 文で順に調べます。
export function nextPrime(n: number): number {
  const isPrimeNumber = (k: number): boolean => {
    if (k < 2) {
      return false;
    }
    for (let i = 2; i * i <= k; i++) {
      if (k % i === 0) {
        return false;
      }
    }
    return true;
  };
  let candidate = n + 1;
  while (!isPrimeNumber(candidate)) {
    candidate++;
  }
  return candidate;
}
