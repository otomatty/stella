export function chunk(items: readonly number[], size: number): number[][] {
  if (size < 1) {
    throw new Error("size は1以上にしてください");
  }
  const result: number[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

export function findFirstDuplicate(items: readonly string[]): string | undefined {
  const seen: string[] = [];
  for (const item of items) {
    if (seen.includes(item)) {
      return item;
    }
    seen.push(item);
  }
  return undefined;
}

export function multiplicationTable(n: number): string[] {
  const lines: string[] = [];
  for (let i = 1; i <= 9; i++) {
    lines.push(`${n} × ${i} = ${n * i}`);
  }
  return lines;
}
