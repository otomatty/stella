// 問8 型 Box<T>（{ value: T }）を定義して export し、boxOf(value) で Box を作る
//     例: boxOf(5) → { value: 5 }
// 型変数を unknown で置き換えないでください。

export type Box<T> = { value: T };

export function boxOf<T>(value: T): Box<T> {
  return { value };
}
