import { formatRecord } from "./format-record.ts";
import { records } from "./records.ts";
import { sumWeek } from "./sum-week.ts";

const week = "2026-W10";
console.log(`週報 ${week}`);
for (const record of records) {
  if (record.week === week) {
    console.log(formatRecord(record));
  }
}
console.log(`合計：${sumWeek(records, week)}分`);
