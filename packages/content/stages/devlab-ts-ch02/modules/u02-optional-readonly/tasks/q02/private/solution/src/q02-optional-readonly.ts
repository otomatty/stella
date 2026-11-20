export type User = {
  readonly id: number;
  name: string;
  nickname?: string;
};

export function displayName(user: User): string {
  return user.nickname ?? user.name;
}

export function hasNickname(user: User): boolean {
  return user.nickname !== undefined;
}
