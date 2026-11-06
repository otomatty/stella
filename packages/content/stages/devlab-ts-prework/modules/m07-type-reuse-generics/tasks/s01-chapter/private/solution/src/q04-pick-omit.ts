export type User = {
  id: number;
  name: string;
  email: string;
  password: string;
  createdAt: Date;
};

export type PublicUser = Omit<User, "password">;
export type UserSummary = Pick<User, "id" | "name">;
export type NewUser = Omit<User, "id" | "createdAt">;
export type UserUpdate = Partial<Pick<User, "name" | "email">>;

export function toPublic(user: User): PublicUser {
  return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt };
}

export function toSummary(user: User): UserSummary {
  return { id: user.id, name: user.name };
}

export function createUser(input: NewUser, id: number, createdAt: Date): User {
  return { ...input, id, createdAt };
}

export function applyUpdate(user: User, update: UserUpdate): User {
  return { ...user, ...update };
}
