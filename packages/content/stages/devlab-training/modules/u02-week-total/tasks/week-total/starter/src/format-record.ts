import type { WorkRecord } from "./records.ts";

export function formatRecord(record: WorkRecord): string {
  const time = record.minutes === null ? "未入力" : `${record.minutes}分`;
  return `${record.title}・${time}`;
}
