import { inArray } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { codingRules } from "../db/schema.js";
import { type CodingRuleText, renderRuleBlocks } from "./ai-review-prompt.js";

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * 講座に当てるコーディング規則 (共通 + 講座の追加分) と、その版。版は AI に渡す規則の本文の
 * ハッシュで、提出の時点の版を `submissions.rule_set_hash` に記録する。AI のレビューは今の版と
 * 食い違えば人に回す (提出のあとに seed で規則が変わったら、受け付けた時点に無かった規則で判定しない)。
 */
export async function loadCodingRuleSet(db: Db, courseSlug: string) {
  const rows = await db
    .select()
    .from(codingRules)
    .where(inArray(codingRules.scope, ["common", courseSlug]))
    .orderBy(codingRules.position);
  const toText = (r: typeof codingRules.$inferSelect): CodingRuleText => ({
    id: r.id,
    title: r.title,
    statement: r.statement,
    appliesTo: r.appliesTo,
    introducedIn: r.introducedIn,
    exception: r.exception,
  });
  const commonRules = rows.filter((r) => r.scope === "common").map(toText);
  const courseRules = rows.filter((r) => r.scope === courseSlug).map(toText);
  const blocks = renderRuleBlocks({ commonRules, courseRules, courseSlug });
  return {
    rows,
    commonRules,
    courseRules,
    hash: await sha256Hex(`${blocks.common}\n\n${blocks.course}`),
  };
}
