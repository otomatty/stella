// 問15 点を dx、dy だけ動かした新しい点を返す。点の型は typeof ORIGIN
//     例: movePoint({ x: 1, y: 2 }, 3, 4) → { x: 4, y: 6 }
// 定義済みの定数は書き換えません。
// 引数と戻り値に型注釈を付けます。

export const ORIGIN = { x: 0, y: 0 };

export function movePoint(point: typeof ORIGIN, dx: number, dy: number): typeof ORIGIN {
  return { x: point.x + dx, y: point.y + dy };
}
