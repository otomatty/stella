import type { WorkRecord } from "../provided/types";

export function sumWeek(records: readonly WorkRecord[], week: string): number {
  let total = 0;
  for (const record of records) {
    if (record.week === week && record.status === "confirmed") {
      total += record.minutes ?? 0;
    }
  }
  return total;
}
