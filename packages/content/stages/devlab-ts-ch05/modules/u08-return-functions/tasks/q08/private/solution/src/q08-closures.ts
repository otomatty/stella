// 問題
// 関数を返す関数を書いてください。返された関数は、作られたときの変数を覚えていて、使い続けられる（クロージャ）。
// 引数と戻り値には型注釈を付けること。
//
// 1. createCounter(start = 0)
//    { increment, reset, current } の3つの関数を持つオブジェクトを返す
//    - increment(): 1増やして、増やした後の値を返す
//    - reset(): start に戻す。何も返さない
//    - current(): 今の値を返す
//
// 2. makeMultiplier(n)
//    受け取った数を n 倍して返す関数を返す
//    例: const triple = makeMultiplier(3); triple(5) → 15
//
// 3. once(fn)
//    fn を最初の1回だけ呼ぶ関数を返す。2回目からは fn を呼ばず、1回目の結果を返す。fn の型は () => number
//
// 4. makeIdGenerator(prefix)
//    呼ぶたびに "user-1"、"user-2"… と番号を増やした文字列を返す関数を返す（prefix が "user" のとき）

export function createCounter(start = 0): {
  increment: () => number;
  reset: () => void;
  current: () => number;
} {
  let value = start;
  return {
    increment: () => {
      value++;
      return value;
    },
    reset: () => {
      value = start;
    },
    current: () => value,
  };
}

export function makeMultiplier(n: number): (x: number) => number {
  return (x) => x * n;
}

export function once(fn: () => number): () => number {
  let result: number | undefined;
  return () => {
    result ??= fn();
    return result;
  };
}

export function makeIdGenerator(prefix: string): () => string {
  let count = 0;
  return () => {
    count++;
    return `${prefix}-${count}`;
  };
}
