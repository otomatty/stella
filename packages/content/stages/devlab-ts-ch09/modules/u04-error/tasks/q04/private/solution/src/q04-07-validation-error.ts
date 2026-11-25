// 問7 Error を継承したクラス ValidationError を書く。constructor(field, message) で、field（文字列）を readonly で持つ。name は "ValidationError"
//     例: new ValidationError("email", "形が違います").field → "email"

export class ValidationError extends Error {
  readonly field: string;

  constructor(field: string, message: string) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
  }
}
