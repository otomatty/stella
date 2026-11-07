// 09-q01 Map ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/map

// 問20
export function lastSeen(events: readonly { user: string; time: number }[]): Map<string, number> {
  const result = new Map<string, number>();
  for (const event of events) {
    const current = result.get(event.user);
    if (current === undefined || event.time > current) {
      result.set(event.user, event.time);
    }
  }
  return result;
}
