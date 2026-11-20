// 03-q02 リテラル型のユニオン ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/literal-types
//       https://typescriptbook.jp/reference/values-types-variables/union

// 問20
export type Visibility = "public" | "private";

export function canView(visibility: Visibility, isOwner: boolean): boolean {
  return visibility === "public" || isOwner;
}
