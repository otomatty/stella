/** 学習記録の分を合計する。 */
export function totalMinutes(records) {
  return records.reduce((sum, record) => sum + record.minutes, 0);
}

/** 分を「X 時間 Y 分」の文にする。1 時間に満たないときは分だけ。 */
export function formatMinutes(total) {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return hours === 0 ? `${minutes} 分` : `${hours} 時間 ${minutes} 分`;
}
