export function parseAge(input: string): number {
  const text = input.trim();
  const age = Number(text);
  if (text === "" || !Number.isInteger(age) || age < 0 || age > 150) {
    throw new Error(`年齢として読めません: ${input}`);
  }
  return age;
}

export function safeParseAge(input: string): number | null {
  try {
    return parseAge(input);
  } catch {
    return null;
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "不明なエラー";
}

export function parseAges(inputs: readonly string[]): { ages: number[]; errors: string[] } {
  const ages: number[] = [];
  const errors: string[] = [];
  for (const input of inputs) {
    try {
      ages.push(parseAge(input));
    } catch (error) {
      errors.push(errorMessage(error));
    }
  }
  return { ages, errors };
}
