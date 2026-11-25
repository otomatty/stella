// 問5 from と、省略できる to。from から to まで1ずつ減らした配列を返す。to を省略したら 1
//     例: countdownFrom(3) → [3, 2, 1]
// 引数と戻り値には型注釈を付けてください。
// 省略できる引数は ? で宣言し、関数の中で ?? や === undefined で省略を扱ってください。

export function countdownFrom(from: number, to?: number): number[] {
  const end = to ?? 1;
  const result: number[] = [];
  for (let i = from; i >= end; i--) {
    result.push(i);
  }
  return result;
}
