// 問19 { x } と { y } を合わせて { x, y } にする
//     例: combine({ x: 1 }, { y: 2 }) → { x: 1, y: 2 }
// 引数と戻り値には型注釈を付けます。
// 2つのオブジェクトをスプレッド構文でまとめます。
export function combine(a: { x: number }, b: { y: number }): { x: number; y: number } {
  return { ...a, ...b };
}
