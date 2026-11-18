import type { WorkRecord } from "./types";

export function sumWeek(records: readonly WorkRecord[], week: string): number {
  return records
    .filter((record) => record.week === week)
    .reduce((total, record) => total + (record.minutes ?? 0), 0);
}
