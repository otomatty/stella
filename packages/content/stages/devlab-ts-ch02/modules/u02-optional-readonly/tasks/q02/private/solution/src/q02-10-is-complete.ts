// 問10 { name?, email? } の両方がそろっていれば true
//     例: isComplete({ name: "山田" }) → false
// 引数と戻り値には型注釈を付けます。
// 値が省略されたかどうかは undefined と比較して確かめます。
export function isComplete(profile: { name?: string; email?: string }): boolean {
  return profile.name !== undefined && profile.email !== undefined;
}
