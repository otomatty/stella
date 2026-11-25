// 問13 "ここには来ないはずです" の Error を投げる関数。引数はなし、戻り値の型は never
//     例: unreachable() → Error "ここには来ないはずです"
export function unreachable(): never {
  throw new Error("ここには来ないはずです");
}
