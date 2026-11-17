// 03-q02 リテラル型のユニオン ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/literal-types
//       https://typescriptbook.jp/reference/values-types-variables/union
//
// 引数と戻り値には型注釈を付けること。
// 定義済みの型 Direction、Weekday、Plan を使う。
// 文字列から型の値に変える関数（parse…）は、どれにも当てはまらなければ undefined を返す。

export type Direction = "up" | "down" | "left" | "right";

// 問4 向きを矢印にする。up は "↑"、down は "↓"、left は "←"、right は "→"
//     例: arrowOf("left") → "←"
export function arrowOf() {}
