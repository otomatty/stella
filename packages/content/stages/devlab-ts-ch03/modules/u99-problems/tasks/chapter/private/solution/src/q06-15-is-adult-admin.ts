// 03-q06 インターセクション型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/intersection

export type Named = { name: string };

export type Aged = { age: number };

// 問15
export type Member = Named & Aged & { role: "admin" | "member" };

export function isAdultAdmin(member: Member): boolean {
  return member.role === "admin" && member.age >= 18;
}
