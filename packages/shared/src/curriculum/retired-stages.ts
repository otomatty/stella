/** 退役した教材と旧デモ講座。引き継ぐ slug は含めない。
 * 安定 UUID だけを削除し、CMS の別 ID のステージは残す。
 * seed (`export-seed-sql.ts`) がこの一覧のステージを消す。外部の講座が同じ slug を使うと、
 * 入れた直後に消えるので、overlay もここを見て止める。 */
export const RETIRED_STAGES: ReadonlyArray<{ tenantId: string; slug: string }> = [
  { tenantId: "ses", slug: "it-basics" },
  { tenantId: "ses", slug: "modern-css-basics" },
  { tenantId: "ses", slug: "page-composition-basics" },
  { tenantId: "ses", slug: "typescript-basics" },
  { tenantId: "ses", slug: "typescript-node-basics" },
  { tenantId: "ses", slug: "node-basics" },
  { tenantId: "ses", slug: "db-design-basics" },
  { tenantId: "ses", slug: "cli-basics" },
  { tenantId: "ses", slug: "git-basics" },
  { tenantId: "ses", slug: "fetch-api-basics" },
  { tenantId: "ses", slug: "npm-build-basics" },
  { tenantId: "ses", slug: "web-a11y-basics" },
  { tenantId: "ses", slug: "frontend-testing-basics" },
  { tenantId: "ses", slug: "rest-api-basics" },
  { tenantId: "ses", slug: "web-security-basics" },
  { tenantId: "ses", slug: "docker-basics" },
  { tenantId: "ses", slug: "cicd-basics" },
  { tenantId: "ses", slug: "linux-ops-basics" },
  { tenantId: "ses", slug: "observability-basics" },
  // AI駆動開発の島 (2026-10)。Anthropic認定資格の島に置き換え、教材は作り直す。
  { tenantId: "ses", slug: "ai-fluency-basics" },
  { tenantId: "ses", slug: "claude-chat-basics" },
  { tenantId: "ses", slug: "claude-code-basics" },
  { tenantId: "ses", slug: "claude-code-skills" },
  { tenantId: "ses", slug: "claude-code-team" },
  { tenantId: "ses", slug: "claude-cowork-basics" },
  { tenantId: "ses", slug: "web-fundamentals" },
  { tenantId: "ses", slug: "ciso-basic" },
  { tenantId: "ses", slug: "react-intro" },
  { tenantId: "coach", slug: "safety-1" },
  { tenantId: "coach", slug: "comm-1" },
  { tenantId: "coach", slug: "first-aid" },
];
