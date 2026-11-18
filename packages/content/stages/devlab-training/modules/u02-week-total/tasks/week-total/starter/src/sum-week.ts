import type { WorkRecord } from "./records.ts";

export function sumWeek(records: readonly WorkRecord[], week: string): number {
  // TODO: 件数を数える代わりに、指定した週の作業時間を足す。
  return records.filter((record) => record.week === week).length;
}
