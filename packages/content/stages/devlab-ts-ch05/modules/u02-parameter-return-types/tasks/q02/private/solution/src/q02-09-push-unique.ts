// 問9 item が items になければ末尾に足して true、すでにあれば何もせず false を返す
//     例: pushUnique(["a"], "b") → true
// 引数と戻り値には型注釈を付けてください。

export function pushUnique(items: string[], item: string): boolean {
  if (items.includes(item)) {
    return false;
  }
  items.push(item);
  return true;
}
