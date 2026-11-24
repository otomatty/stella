// 問20 型 Visibility（"public" か "private"）を定義して export し、canView(visibility: Visibility, isOwner: boolean) を書く。public なら誰でも、private なら持ち主だけ true
//     例: canView("private", false) → false
// 引数と戻り値に型注釈を付ける。
// type と | を使い、リテラル型のユニオンを定義する。

export type Visibility = "public" | "private";

export function canView(visibility: Visibility, isOwner: boolean): boolean {
  return visibility === "public" || isOwner;
}
