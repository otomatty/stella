// 05-q06 分割代入引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/destructuring-assignment-parameters
//       https://typescriptbook.jp/reference/functions/keyword-arguments-and-options-object-pattern

// 問11
export function makeMember({
  name,
  role = "member",
}: {
  name: string;
  role?: "admin" | "member";
}): { name: string; role: "admin" | "member" } {
  return { name, role };
}
