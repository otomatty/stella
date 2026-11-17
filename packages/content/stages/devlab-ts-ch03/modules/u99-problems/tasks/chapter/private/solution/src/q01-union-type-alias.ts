export type Id = string | number;

export function normalizeId(id: Id): string {
  if (typeof id === "number") {
    return String(id).padStart(6, "0");
  }
  return id.trim().toUpperCase();
}

export function joinIds(ids: readonly Id[]): string {
  return ids.map(normalizeId).join(", ");
}
