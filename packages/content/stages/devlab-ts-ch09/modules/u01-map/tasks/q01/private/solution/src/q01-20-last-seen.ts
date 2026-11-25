// 問20 { user, time } の配列から、ユーザーごとのいちばん大きい time の Map を返す（キーは最初に出てきた順）
//     例: lastSeen([{ user: "a", time: 5 }, { user: "a", time: 3 }]) → Map { "a" => 5 }
// 引数と戻り値に型注釈を付けます。

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
