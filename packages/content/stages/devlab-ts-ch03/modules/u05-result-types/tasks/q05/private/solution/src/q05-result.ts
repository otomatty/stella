export type ParseResult = { ok: true; value: number } | { ok: false; error: string };

export function parseNumber(text: string): ParseResult {
  const trimmed = text.trim();
  const value = Number(trimmed);
  if (trimmed === "" || !Number.isFinite(value)) {
    return { ok: false, error: `数値ではありません: ${text}` };
  }
  return { ok: true, value };
}

export function unwrapOr(result: ParseResult, fallback: number): number {
  return result.ok ? result.value : fallback;
}

export function sumValid(results: readonly ParseResult[]): number {
  let total = 0;
  for (const result of results) {
    if (result.ok) {
      total += result.value;
    }
  }
  return total;
}
