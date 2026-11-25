// 問12 { push, pop, size } を返す。push(n) で積み（何も返さない）、pop() で最後に積んだものを取り出して返す（空なら undefined）、size() で数を返す
//     例: const s = makeStack(); s.push(1); s.pop() → 1
// 戻り値の型注釈には、各プロパティの関数の型を書いてください。
// 外側の関数に状態を持たせ、返す関数から読み書きしてください。

export function makeStack(): {
  push: (n: number) => void;
  pop: () => number | undefined;
  size: () => number;
} {
  const items: number[] = [];
  return {
    push: (n) => {
      items.push(n);
    },
    pop: () => items.pop(),
    size: () => items.length,
  };
}
