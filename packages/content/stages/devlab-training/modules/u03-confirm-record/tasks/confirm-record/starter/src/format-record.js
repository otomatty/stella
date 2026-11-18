export function formatRecord(record) {
  const time = record.minutes === null ? "未入力" : `${record.minutes}分`;
  return `${record.title}・${time}`;
}
