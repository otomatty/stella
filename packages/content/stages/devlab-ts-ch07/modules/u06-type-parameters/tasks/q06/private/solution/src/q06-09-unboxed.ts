// 問9 { value: T } から value を取り出す
//     例: unboxed({ value: "a" }) → "a"
// 型変数を unknown で置き換えないでください。

export function unboxed<T>(box: { value: T }): T {
  return box.value;
}
