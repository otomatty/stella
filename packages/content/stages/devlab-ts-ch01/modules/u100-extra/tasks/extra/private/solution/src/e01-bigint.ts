// 問題
// factorial(n) を書いてください。n の階乗（1 × 2 × … × n）を返す。
// 引数と戻り値は bigint にすること。
// 例: factorial(5n)  → 120n
//     factorial(0n)  → 1n
//     factorial(25n) → 15511210043330985984000000n
// n が負の数なら Error を投げる
//
// 説明すること（答えは、この下に // のコメントで書く）
// - number で 25 の階乗を計算すると、結果はどうなるか。なぜそうなるのか

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
