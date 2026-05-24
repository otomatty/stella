/**
 * Cloudflare Workers バインディング型。
 */

export interface Env {
  ANTHROPIC_API_KEY: string;
  ANTHROPIC_MODEL?: string;
  /** カンマ区切り。 `*.example.com` でサブドメインを許可。 */
  ALLOWED_ORIGINS: string;
  ISOLATE_MEMORY_LIMIT?: string;
}
