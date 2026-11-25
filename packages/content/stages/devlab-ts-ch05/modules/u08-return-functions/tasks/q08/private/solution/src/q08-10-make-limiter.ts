// 問10 max 回目までは true、それより後は false を返す関数を返す
//     例: const allow = makeLimiter(2); allow() → true、allow() → true、allow() → false
// 引数には型注釈を付け、戻り値の型は (x: number) => number のように書いてください。
// 外側の関数に状態を持たせ、返す関数から読み書きしてください。

export function makeLimiter(max: number): () => boolean {
  let used = 0;
  return () => {
    used++;
    return used <= max;
  };
}
