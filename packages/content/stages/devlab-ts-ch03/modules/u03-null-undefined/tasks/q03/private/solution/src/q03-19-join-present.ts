// 問19 null でないものだけを半角スペースでつなぐ
//     例: joinPresent("山田", null) → "山田"
// 引数と戻り値に型注釈を付ける。
// === null または !== null で、値があるかを確かめる。

export function joinPresent(a: string | null, b: string | null): string {
  if (a === null) {
    return b ?? "";
  }
  if (b === null) {
    return a;
  }
  return `${a} ${b}`;
}
