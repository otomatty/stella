/** 相対時刻 (例: 3分前 / 2時間前 / 4日前)。 1週間以上は日付表記。 */
export function relativeTime(value: string | number): string {
  const date = new Date(value);
  const then = date.getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "たった今";
  if (min < 60) return `${min}分前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}時間前`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}日前`;
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}
