// 09-q02 Set ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/set

export type User = { id: number; name: string };

// 問18
export function uniqueById(users: User[]): User[] {
  const seen = new Set<number>();
  return users.filter((user) => {
    if (seen.has(user.id)) {
      return false;
    }
    seen.add(user.id);
    return true;
  });
}
