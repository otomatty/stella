export type Status = "draft" | "published" | "archived" | "deleted";
export type AppEvent = { type: "click"; x: number; y: number } | { type: "key"; key: string };
export type MaybeName = string | null | undefined;

export function createSession(userId: number) {
  return { userId, token: `t-${userId}`, expiresAt: 0 };
}

export async function fetchUser(id: number) {
  await Promise.resolve();
  return { id, name: "山田" };
}

export type ActiveStatus = Exclude<Status, "archived" | "deleted">;
export type ClickEvent = Extract<AppEvent, { type: "click" }>;
export type Name = NonNullable<MaybeName>;
export type Session = ReturnType<typeof createSession>;
export type FetchedUser = Awaited<ReturnType<typeof fetchUser>>;

export function isActive(status: Status): status is ActiveStatus {
  return status === "draft" || status === "published";
}
