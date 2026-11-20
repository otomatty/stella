export function sumAll(...numbers: number[]): number {
  let total = 0;
  for (const n of numbers) {
    total += n;
  }
  return total;
}

export function maxOf(first: number, ...rest: number[]): number {
  let max = first;
  for (const n of rest) {
    if (n > max) {
      max = n;
    }
  }
  return max;
}

export function joinPath(...parts: string[]): string {
  const cleaned: string[] = [];
  for (const part of parts) {
    const trimmed = part.replace(/^\/+|\/+$/g, "");
    if (trimmed !== "") {
      cleaned.push(trimmed);
    }
  }
  return cleaned.join("/");
}

export function tagged(tag: string, ...items: string[]): string {
  return items.length === 0 ? `[${tag}]` : `[${tag}] ${items.join(", ")}`;
}
