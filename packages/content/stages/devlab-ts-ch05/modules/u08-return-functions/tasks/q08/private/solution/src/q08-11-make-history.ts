// 問11 { add, list } を返す。add(text) で履歴に足し（何も返さない）、list() でそれまでの履歴の配列（コピー）を返す
//     例: const h = makeHistory(); h.add("a"); h.list() → ["a"]
// 戻り値の型注釈には、各プロパティの関数の型を書いてください。
// 外側の関数に状態を持たせ、返す関数から読み書きしてください。

export function makeHistory(): { add: (text: string) => void; list: () => string[] } {
  const items: string[] = [];
  return {
    add: (text) => {
      items.push(text);
    },
    list: () => [...items],
  };
}
