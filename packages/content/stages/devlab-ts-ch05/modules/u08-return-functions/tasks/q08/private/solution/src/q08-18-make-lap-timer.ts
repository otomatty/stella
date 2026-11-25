// 問18 時刻 t（ミリ秒）を受け取り、前回呼んだときの t との差を返す関数を返す。1回目は t をそのまま返す
//     例: const lap = makeLapTimer(); lap(1000) → 1000、lap(1500) → 500
// 戻り値の型は () => number や (x: number) => number のように書いてください。
// 外側の関数に状態を持たせ、返す関数から読み書きしてください。

export function makeLapTimer(): (t: number) => number {
  let last = 0;
  return (t) => {
    const lap = t - last;
    last = t;
    return lap;
  };
}
