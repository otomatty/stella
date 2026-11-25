// 問15 0以上の整数を2進数で書いたときの桁数を返す。0 は 1
//     例: bitLength(10) → 4
// 引数と戻り値に型注釈を付けます。
// 0 でも少なくとも1回実行するため、do-while 文を使います。
export function bitLength(n: number): number {
  let rest = n;
  let count = 0;
  do {
    rest = Math.floor(rest / 2);
    count++;
  } while (rest > 0);
  return count;
}
