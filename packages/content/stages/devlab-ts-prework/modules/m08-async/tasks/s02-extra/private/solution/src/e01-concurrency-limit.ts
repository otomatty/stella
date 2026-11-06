export async function mapWithLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  if (limit < 1) {
    throw new Error("limit は1以上にしてください");
  }
  const results: R[] = [];
  // 作業者どうしで同じイテレーターを共有し、まだ始めていない要素を1つずつ取り出す
  const queue = items.entries();
  const worker = async () => {
    for (const [index, item] of queue) {
      results[index] = await fn(item);
    }
  };
  const workerCount = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}
