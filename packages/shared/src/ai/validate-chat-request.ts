/**
 * `POST /api/chat` の入力バリデータ。
 *
 * Hono API ハンドラ (`apps/api`) から import される。
 * ランタイム依存を持たない純粋関数なので `@falcon/shared` に置く。
 *
 * 検証内容:
 * - context.kind が "practice" のとき assignmentId が必須。
 * - context は kind ベースで構造検証 (lesson/practice/general)。
 * - 1 メッセージ最大文字数と、合計最大文字数の両方を制限する。
 * - 末尾は user メッセージである必要 (assistant 応答を期待するため)。
 */

import type { ChatContext, ChatRequest } from "./types.js";

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

  const contextResult = validateContext(body.context);
  if (!contextResult.ok) {
    return contextResult;
  }
  const context = contextResult.value;

  const assignmentIdValue = typeof body.assignmentId === "string" ? body.assignmentId.trim() : "";
  const needsAssignmentId = context?.kind === "practice";
  if (needsAssignmentId && assignmentIdValue.length === 0) {
    return {
      ok: false,
      status: 400,
      message: "assignmentId is required for practice context",
    };
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

  const normalized: ChatRequest = {
    messages: body.messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  };
  if (assignmentIdValue.length > 0) {
    normalized.assignmentId = assignmentIdValue;
  }
  if (context !== undefined) {
    normalized.context = context;
  }

  return { ok: true, body: normalized };
}

function validateContext(
  raw: unknown,
): { ok: true; value: ChatContext | undefined } | { ok: false; status: 400; message: string } {
  if (raw === undefined || raw === null) {
    return { ok: true, value: undefined };
  }
  if (typeof raw !== "object") {
    return { ok: false, status: 400, message: "Invalid context" };
  }
  const c = raw as { kind?: unknown };
  switch (c.kind) {
    case "general":
      return { ok: true, value: { kind: "general" } };
    case "lesson": {
      const lessonTitle = (c as { lessonTitle?: unknown }).lessonTitle;
      const stageTitle = (c as { stageTitle?: unknown }).stageTitle;
      if (
        typeof lessonTitle !== "string" ||
        lessonTitle.trim().length === 0 ||
        typeof stageTitle !== "string" ||
        stageTitle.trim().length === 0
      ) {
        return {
          ok: false,
          status: 400,
          message: "lesson context requires lessonTitle and stageTitle",
        };
      }
      return {
        ok: true,
        value: {
          kind: "lesson",
          lessonTitle: lessonTitle.trim(),
          stageTitle: stageTitle.trim(),
        },
      };
    }
    case "practice": {
      const cp = c as {
        assignmentId?: unknown;
        summary?: unknown;
        userCode?: unknown;
      };
      if (typeof cp.assignmentId !== "string" || cp.assignmentId.trim().length === 0) {
        return {
          ok: false,
          status: 400,
          message: "practice context requires assignmentId",
        };
      }
      if (typeof cp.userCode !== "string") {
        return {
          ok: false,
          status: 400,
          message: "practice context requires userCode",
        };
      }
      if (!cp.summary || typeof cp.summary !== "object") {
        return {
          ok: false,
          status: 400,
          message: "practice context requires summary",
        };
      }
      const s = cp.summary as {
        cleared?: unknown;
        lintFailures?: unknown;
        astFailures?: unknown;
        testFailures?: unknown;
      };
      if (
        typeof s.cleared !== "boolean" ||
        !Array.isArray(s.lintFailures) ||
        !Array.isArray(s.astFailures) ||
        !Array.isArray(s.testFailures)
      ) {
        return {
          ok: false,
          status: 400,
          message: "practice context summary is malformed",
        };
      }
      return {
        ok: true,
        value: {
          kind: "practice",
          assignmentId: cp.assignmentId.trim(),
          userCode: cp.userCode,
          summary: {
            cleared: s.cleared,
            lintFailures: s.lintFailures,
            astFailures: s.astFailures,
            testFailures: s.testFailures,
          },
        },
      };
    }
    default:
      return { ok: false, status: 400, message: "Invalid context kind" };
  }
}
