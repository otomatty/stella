// 問7 受け取った数を足し続け、それまでの合計を返す関数を返す
//     例: const add = makeAccumulator(); add(5) → 5、add(3) → 8
// 戻り値の型は () => number や (x: number) => number のように書いてください。
// 外側の関数に状態を持たせ、返す関数から読み書きしてください。

export function makeAccumulator(): (n: number) => number {
  let total = 0;
  return (n) => {
    total += n;
    return total;
  };
}
