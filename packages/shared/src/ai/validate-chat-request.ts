/**
 * `POST /api/chat` の入力バリデータ。
 *
 * Vercel Serverless ランタイムの API ハンドラから import される。
 * ランタイム依存を持たない純粋関数なので `@falcon/shared` に置く。
 *
 * 検証内容:
 * - assignmentId / content は空白のみを許容しない (trim 比較)。
 * - 1 メッセージ最大文字数と、合計最大文字数の両方を制限する。
 * - 末尾は user メッセージである必要 (assistant 応答を期待するため)。
 */

import type { ChatRequest } from "./types.js";

type ValidateResult =
  | { ok: true; body: ChatRequest }
  | { ok: false; status: 400 | 500; message: string };

const MAX_MESSAGES = 50;
const MAX_CONTENT_CHARS = 32_000;
/** 全メッセージ合計の上限。推論コスト・遅延の暴走防止。 */
const MAX_TOTAL_CONTENT_CHARS = 120_000;

export function validateChatRequest(raw: unknown): ValidateResult {
  if (!raw || typeof raw !== "object") {
    return { ok: false, status: 400, message: "Invalid body" };
  }
  const body = raw as Partial<ChatRequest>;

  if (
    typeof body.assignmentId !== "string" ||
    body.assignmentId.trim().length === 0
  ) {
    return { ok: false, status: 400, message: "assignmentId is required" };
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return {
      ok: false,
      status: 400,
      message: "messages must be a non-empty array",
    };
  }
  if (body.messages.length > MAX_MESSAGES) {
    return {
      ok: false,
      status: 400,
      message: `messages must be ${MAX_MESSAGES} or fewer`,
    };
  }

  let totalChars = 0;
  for (const m of body.messages) {
    if (!m || typeof m !== "object") {
      return { ok: false, status: 400, message: "Invalid message entry" };
    }
    if (m.role !== "user" && m.role !== "assistant") {
      return { ok: false, status: 400, message: "Invalid message role" };
    }
    if (typeof m.content !== "string" || m.content.trim().length === 0) {
      return { ok: false, status: 400, message: "Invalid message content" };
    }
    if (m.content.length > MAX_CONTENT_CHARS) {
      return { ok: false, status: 400, message: "Message content too long" };
    }
    totalChars += m.content.length;
    if (totalChars > MAX_TOTAL_CONTENT_CHARS) {
      return {
        ok: false,
        status: 400,
        message: "Total message content too long",
      };
    }
  }

  const last = body.messages[body.messages.length - 1];
  if (last.role !== "user") {
    return {
      ok: false,
      status: 400,
      message: "Last message must be from user",
    };
  }

  return {
    ok: true,
    body: {
      assignmentId: body.assignmentId.trim(),
      messages: body.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    },
  };
}
