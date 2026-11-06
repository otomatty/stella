export type User = { id: number; name: string };
export type FetchUser = (id: number) => Promise<User>;

export async function getUserName(fetchUser: FetchUser, id: number): Promise<string> {
  const user = await fetchUser(id);
  return user.name;
}

export async function getUsersInOrder(
  fetchUser: FetchUser,
  ids: readonly number[],
): Promise<User[]> {
  const users: User[] = [];
  for (const id of ids) {
    users.push(await fetchUser(id));
  }
  return users;
}

export async function getUsersAtOnce(
  fetchUser: FetchUser,
  ids: readonly number[],
): Promise<User[]> {
  return await Promise.all(ids.map((id) => fetchUser(id)));
}

export async function getNamesText(fetchUser: FetchUser, ids: readonly number[]): Promise<string> {
  const users = await getUsersAtOnce(fetchUser, ids);
  return users.map((u) => u.name).join("、");
}
