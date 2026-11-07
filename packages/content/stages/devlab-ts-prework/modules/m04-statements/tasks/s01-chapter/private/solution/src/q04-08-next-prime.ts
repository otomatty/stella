// 04-q04 while文と break・continue ドリル
//
// 教材: https://jsprimer.net/basic/loop/

// 問8
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
