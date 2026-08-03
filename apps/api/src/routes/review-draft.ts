/**
 * POST /api/review-draft — 講師向け AI 添削下書き (JSON)。
 */

import { buildHeuristicReviewDraft } from "@falcon/shared/review/heuristic-draft";
import { parseReviewDraftJson } from "@falcon/shared/review/parse-draft-json";
import {
  buildReviewDraftSystemPrompt,
  buildReviewDraftUserMessage,
} from "@falcon/shared/review/prompt";
import { validateReviewDraftRequest } from "@falcon/shared/review/validate-review-draft-request";
import { Hono } from "hono";

import type { Env } from "../env.js";
import { completeMessage } from "../lib/anthropic-complete.js";
import { MissingApiKeyError } from "../lib/anthropic.js";
import { ApiError, errorResponse, getCaller, isStaffRole } from "../lib/authz.js";
import { enforceAiRateLimit } from "../lib/rate-limit.js";

export const reviewDraftRoute = new Hono<{ Bindings: Env }>();

reviewDraftRoute.post("/api/review-draft", async (c) => {
  const limited = await enforceAiRateLimit(c);
  if (limited) return limited;

  try {
    const { caller } = await getCaller(c);
    if (!isStaffRole(caller.role)) {
      throw new ApiError("権限がありません", 403);
    }
  } catch (err) {
    return errorResponse(c, err);
  }

  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const validated = validateReviewDraftRequest(raw);
  if (!validated.ok) {
    return c.json({ error: validated.message }, validated.status);
  }
  const body = validated.body;

  if (!c.env.ANTHROPIC_API_KEY) {
    return c.json(buildHeuristicReviewDraft(body.code));
  }

  try {
    const text = await completeMessage({
      env: c.env,
      system: buildReviewDraftSystemPrompt(),
      messages: [
        {
          role: "user",
          content: buildReviewDraftUserMessage(body),
        },
      ],
      signal: c.req.raw.signal,
    });
    const parsed = parseReviewDraftJson(text);
    if (parsed) {
      return c.json(parsed);
    }
    return c.json(buildHeuristicReviewDraft(body.code));
  } catch (e) {
    if (e instanceof MissingApiKeyError) {
      return c.json(buildHeuristicReviewDraft(body.code));
    }
    console.error("[review-draft]", e);
    return c.json({ error: "AI 下書きの生成に失敗しました" }, 500);
  }
});
