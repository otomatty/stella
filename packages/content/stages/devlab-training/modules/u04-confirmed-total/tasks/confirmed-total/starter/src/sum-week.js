export function sumWeek(records, week) {
  let total = 0;
  for (const record of records) {
    if (record.week === week) {
      total += record.minutes ?? 0;
    }
  }
  return total;
}
