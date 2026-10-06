/**
 * POST /api/chat — Anthropic Claude または Grok への SSE プロキシ。
 */

import { buildSystemPrompt } from "@stella/shared/ai/prompt";
import type { ChatContext, ChatStreamEvent } from "@stella/shared/ai/types";
import { validateChatRequest } from "@stella/shared/ai/validate-chat-request";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";

import type { Db } from "../db/client.js";
import { sections, stages, tasks } from "../db/schema.js";
import type { Env } from "../env.js";
import { MissingApiKeyError, streamChat } from "../lib/anthropic.js";
import { assertGrokGatewayConfigured, resolveChatProvider } from "../lib/chat-provider.js";
import { streamGrokChat } from "../lib/grok-chat.js";
import { ApiError, type Caller, errorResponse, getCaller } from "../lib/authz.js";
import { enforceAiRateLimit } from "../lib/rate-limit.js";
import { canAccessTasks } from "../lib/task-access.js";
import { recordSupportEvent } from "../lib/task-support.js";

const SERVER_TIMEOUT_MS = 75_000;

export const chatRoute = new Hono<{ Bindings: Env }>();

/**
 * 課題の相談は、受講中の課題に限って受け付け、課題の支援として記録する (#38)。
 * 題名はクライアントの値を使わず、課題から引き直す。
 */
async function taskChatContext(
  db: Db,
  caller: Caller,
  context: Extract<ChatContext, { kind: "task" }>,
): Promise<ChatContext> {
  const [task] = await db
    .select({ id: tasks.id, title: tasks.title, stageId: stages.id, stageTitle: stages.title })
    .from(tasks)
    .innerJoin(sections, eq(sections.id, tasks.sectionId))
    .innerJoin(stages, eq(stages.id, sections.stageId))
    .where(and(eq(tasks.id, context.taskId), eq(tasks.active, true)))
    .limit(1);
  if (!task || !(await canAccessTasks(db, caller, task.stageId)))
    throw new ApiError("課題が見つかりません", 404);
  await recordSupportEvent(db, {
    tenantId: caller.tenantId,
    userId: caller.id,
    taskId: task.id,
    kind: "ai-chat",
  });
  return { kind: "task", taskId: task.id, taskTitle: task.title, stageTitle: task.stageTitle };
}

chatRoute.post("/api/chat", async (c) => {
  const limited = await enforceAiRateLimit(c);
  if (limited) return limited;

  let auth: Awaited<ReturnType<typeof getCaller>>;
  try {
    auth = await getCaller(c);
  } catch (err) {
    return errorResponse(c, err);
  }

  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const validated = validateChatRequest(raw);
  if (!validated.ok) {
    return c.json({ error: validated.message }, validated.status);
  }
  const body = validated.body;

  try {
    assertGrokGatewayConfigured(c.env);
  } catch (err) {
    return errorResponse(c, err);
  }

  const provider = resolveChatProvider(c.env);
  if (provider === "anthropic" && !c.env.ANTHROPIC_API_KEY) {
    return c.json({ error: new MissingApiKeyError().message }, 500);
  }

  let context = body.context;
  if (context?.kind === "task") {
    try {
      context = await taskChatContext(auth.db, auth.caller, context);
    } catch (err) {
      return errorResponse(c, err);
    }
  }

  const encoder = new TextEncoder();
  const requestSignal = c.req.raw.signal;
  const system = buildSystemPrompt(context);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const upstreamAbort = new AbortController();
      const onClientAbort = () => upstreamAbort.abort();
      requestSignal.addEventListener("abort", onClientAbort);
      const timeoutId = setTimeout(() => upstreamAbort.abort(), SERVER_TIMEOUT_MS);

      const send = (event: ChatStreamEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        const iter =
          provider === "grok"
            ? streamGrokChat({
                env: c.env,
                system,
                messages: body.messages,
                model: c.env.CHAT_MODEL,
                signal: upstreamAbort.signal,
              })
            : streamChat({
                env: c.env,
                system,
                messages: body.messages,
                signal: upstreamAbort.signal,
              });
        for await (const event of iter) {
          send(event);
          if (event.type === "done") {
            break;
          }
        }
      } catch (e) {
        const message = upstreamAbort.signal.aborted
          ? "AI 応答がタイムアウトしました"
          : e instanceof Error
            ? e.message
            : "Unknown error";
        send({ type: "error", message });
      } finally {
        clearTimeout(timeoutId);
        requestSignal.removeEventListener("abort", onClientAbort);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
});
