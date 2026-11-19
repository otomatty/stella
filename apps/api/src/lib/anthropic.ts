export class MissingApiKeyError extends Error {
  constructor() {
    super("ANTHROPIC_API_KEY が設定されていません");
    this.name = "MissingApiKeyError";
  }
}
