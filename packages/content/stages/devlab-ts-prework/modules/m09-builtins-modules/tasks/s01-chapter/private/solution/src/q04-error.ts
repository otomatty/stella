export type User = { email: string; age: number };
export type ValidationResult = { ok: true; user: User } | { ok: false; errors: ValidationError[] };

export class ValidationError extends Error {
  readonly field: string;

  constructor(field: string, message: string) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
  }
}

export function validateEmail(email: string): string {
  const parts = email.split("@");
  if (parts.length !== 2 || parts[0] === "" || parts[1] === "") {
    throw new ValidationError("email", "メールアドレスの形が違います");
  }
  return email;
}

export function validateAge(age: unknown): number {
  if (typeof age !== "number" || !Number.isInteger(age) || age < 0 || age > 150) {
    throw new ValidationError("age", "年齢は0〜150の整数にしてください");
  }
  return age;
}

export function validateUser(input: { email: string; age: unknown }): ValidationResult {
  const errors: ValidationError[] = [];
  const check = <T>(fn: () => T): T | undefined => {
    try {
      return fn();
    } catch (error) {
      if (error instanceof ValidationError) {
        errors.push(error);
        return undefined;
      }
      throw error;
    }
  };
  const email = check(() => validateEmail(input.email));
  const age = check(() => validateAge(input.age));
  if (email === undefined || age === undefined) {
    return { ok: false, errors };
  }
  return { ok: true, user: { email, age } };
}

export function describeError(error: unknown): string {
  if (error instanceof ValidationError) {
    return `${error.field}: ${error.message}`;
  }
  if (error instanceof Error) {
    return `エラー: ${error.message}`;
  }
  return "不明なエラー";
}
