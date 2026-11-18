import type { WorkRecord } from "./records.ts";

export function formatRecord(record: WorkRecord): string {
  return record.title;
  // TODO: 作業時間を表示する。
}
