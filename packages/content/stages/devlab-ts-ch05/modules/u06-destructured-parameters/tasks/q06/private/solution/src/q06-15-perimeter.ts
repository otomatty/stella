// 問15 { width, height } の周りの長さ
//     例: perimeter({ width: 3, height: 4 }) → 14
// 引数と戻り値には型注釈を付けてください。
// オブジェクトは引数の位置で分割代入してください。

export function perimeter({ width, height }: { width: number; height: number }): number {
  return (width + height) * 2;
}
