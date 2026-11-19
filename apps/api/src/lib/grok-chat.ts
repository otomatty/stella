export class MissingAiGatewayTokenError extends Error {
  constructor() {
    super("AI_GATEWAY_CF_API_TOKEN が設定されていません");
    this.name = "MissingAiGatewayTokenError";
  }
}
