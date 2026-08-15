/**
 * POST /api/chat — Anthropic Claude への SSE プロキシ。
 */

import { buildSystemPrompt } from "@falcon/shared/ai/prompt";
import type { ChatStreamEvent } from "@falcon/shared/ai/types";
import { validateChatRequest } from "@falcon/shared/ai/validate-chat-request";
import { Hono } from "hono";

import type { Env } from "../env.js";
import { MissingApiKeyError, streamChat } from "../lib/anthropic.js";
import { errorResponse, getCaller } from "../lib/authz.js";
import { enforceAiRateLimit } from "../lib/rate-limit.js";

const SERVER_TIMEOUT_MS = 75_000;

export const chatRoute = new Hono<{ Bindings: Env }>();

chatRoute.post("/api/chat", async (c) => {
  const limited = await enforceAiRateLimit(c);
  if (limited) return limited;

  try {
    await getCaller(c);
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

  if (!c.env.ANTHROPIC_API_KEY) {
    return c.json({ error: new MissingApiKeyError().message }, 500);
  }

  const encoder = new TextEncoder();
  const requestSignal = c.req.raw.signal;

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
        const iter = streamChat({
          env: c.env,
          system: buildSystemPrompt(body.context),
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
