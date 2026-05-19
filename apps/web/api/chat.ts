/**
 * Vercel Serverless Function: POST /api/chat
 *
 * Anthropic Claude にメッセージ列を投げ、SSE で逐次イベントを返す。
 * イベント形式は `ChatStreamEvent` (text / done / error) を JSON 直列化したもの。
 */

import { buildSystemPrompt } from "@falcon/shared/ai/prompt";
import type { ChatStreamEvent } from "@falcon/shared/ai/types";
import { validateChatRequest } from "@falcon/shared/ai/validate-chat-request";

import { MissingApiKeyError, streamChat } from "./_lib/anthropic-client.js";

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validated = validateChatRequest(raw);
  if (!validated.ok) {
    return Response.json({ error: validated.message }, {
      status: validated.status,
    });
  }
  const body = validated.body;

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: new MissingApiKeyError().message },
      { status: 500 },
    );
  }

  const encoder = new TextEncoder();
  const SERVER_TIMEOUT_MS = 75_000;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const upstreamAbort = new AbortController();
      const onClientAbort = () => upstreamAbort.abort();
      request.signal.addEventListener("abort", onClientAbort);
      // 上流ハング時にレスポンスストリームを確実に閉じる保険
      const timeoutId = setTimeout(
        () => upstreamAbort.abort(),
        SERVER_TIMEOUT_MS,
      );

      const send = (event: ChatStreamEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        const iter = streamChat({
          system: buildSystemPrompt(body.context),
          messages: body.messages,
          signal: upstreamAbort.signal,
        });
        for await (const event of iter) {
          send(event);
          if (event.type === "done") {break;}
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
        request.signal.removeEventListener("abort", onClientAbort);
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
}
