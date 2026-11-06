// number では 2^53 を超えると整数を正確に表せず、25! は 1.5511210043330986e+25 と丸められる
export function factorial(n: bigint): bigint {
  if (n < 0n) {
    throw new Error("n は 0 以上にしてください");
  }
  let result = 1n;
  for (let i = 2n; i <= n; i++) {
    result *= i;
  }
  return result;
}
