// 問4 呼ぶたびに 1、2、3… を返す関数を返す
//     例: const next = makeCounter(); next() → 1、next() → 2
// 戻り値の型は () => number や (x: number) => number のように書いてください。
// 外側の関数に状態を持たせ、返す関数から読み書きしてください。

export function makeCounter(): () => number {
  let count = 0;
  return () => {
    count++;
    return count;
  };
}
