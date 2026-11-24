// 問19 r、g、b から、色のオブジェクト { r, g, b } を作る
//     例: makeColor(0, 128, 255) → { r: 0, g: 128, b: 255 }
// 引数と戻り値には型注釈を付けます。
// オブジェクトの型は { name: string; age: number } のように書きます。型に type で名前を付けてもかまいません。
export function makeColor(r: number, g: number, b: number): { r: number; g: number; b: number } {
  return { r, g, b };
}
