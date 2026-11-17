export function processAll(inputs: readonly string[]): {
  total: number;
  errors: string[];
  log: string[];
} {
  let total = 0;
  const errors: string[] = [];
  const log: string[] = [];
  for (const input of inputs) {
    try {
      let value: unknown;
      try {
        value = JSON.parse(input);
      } catch {
        throw new Error(`読めません: ${input}`);
      }
      if (typeof value !== "number") {
        throw new Error(`数値ではありません: ${input}`);
      }
      total += value;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    } finally {
      log.push(`done: ${input}`);
    }
  }
  return { total, errors, log };
}
