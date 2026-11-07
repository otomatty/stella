// 03-q03 null と undefined ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/undefined-vs-null
//       https://typescriptbook.jp/reference/values-types-variables/object/optional-chaining

// 問15
export function managerName(team: { manager: { name: string } | null }): string {
  return team.manager?.name ?? "未定";
}
