/**
 * `/api/chat` を叩く HTTP クライアント (SSE ストリーミング)。
 *
 * テスト実行系は #105 で `CodeRunner` 抽象 (`lib/runners/*`) に集約された。
 * このファイルは AI チャットの SSE クライアントだけを担当する。
 */
import type { ChatRequest, ChatStreamEvent } from "@falcon/shared/ai/types";
import { getAccessToken } from "@/lib/auth-client";

/** Cloudflare Workers API のオリジン (末尾スラッシュなし)。 `VITE_SERVER_URL` で指定。 */
const SERVER_URL = (import.meta.env.VITE_SERVER_URL ?? "").replace(/\/+$/, "");

/**
 * サーバの POST /api/chat に messages を投げ、SSE で流れてくる
 * `ChatStreamEvent` (text / done / error) を AsyncIterable で返す。
 *
 * - 非 200 はテキスト本文ごと throw する。
 * - チャンク境界をまたぐ `data:` 行を正しく組み立てる (バッファ式)。
 * - 呼び出し側が abort したい場合は `signal` を渡す (fetch にそのまま伝播)。
 */
export async function* streamChat(
  body: ChatRequest,
  options: { signal?: AbortSignal } = {},
): AsyncGenerator<ChatStreamEvent, void, unknown> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${SERVER_URL}/api/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: options.signal,
  });

  if (!res.ok) {
    // 一度ボディを text として読み切ってから JSON.parse を試す。
    // res.json() を先に呼ぶとボディストリームが消費され、 後続の res.text()
    // が必ず失敗してサーバのエラー本文をユーザーに見せられなくなるため。
    let message = `サーバエラー (${res.status})`;
    const text = await res.text().catch(() => "");
    if (text) {
      try {
        const data = JSON.parse(text) as { error?: string };
        if (data.error) {
          message = data.error;
        } else {
          message = `${message}: ${text}`;
        }
      } catch {
        message = `${message}: ${text}`;
      }
    }
    throw new Error(message);
  }

  if (!res.body) {
    throw new Error("ストリームを受信できませんでした");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });

      // SSE のイベント区切りは LF + LF (`\n\n`) または CR/LF + CR/LF (`\r\n\r\n`)。
      // 両方の改行コードを受け付けるため、 正規表現で最初の境界を探す。
      const sepRegex = /\r?\n\r?\n/;
      let match = sepRegex.exec(buffer);
      while (match !== null) {
        const chunk = buffer.slice(0, match.index);
        buffer = buffer.slice(match.index + match[0].length);
        const event = parseSseChunk(chunk);
        if (event) {
          yield event;
        }
        match = sepRegex.exec(buffer);
      }
    }
    // ストリーム終端に残った最後のイベント
    if (buffer.trim().length > 0) {
      const event = parseSseChunk(buffer);
      if (event) {
        yield event;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function parseSseChunk(chunk: string): ChatStreamEvent | null {
  // `data:` 行のみを連結する (id/event/retry/comment は無視)。
  // 行末の `\r` (CRLF サーバ) を許容するため、 split 後に line.replace(/\r$/, "") する。
  const lines = chunk.split("\n").map((l) => l.replace(/\r$/, ""));
  const dataLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).replace(/^ /, ""));
    }
  }
  if (dataLines.length === 0) {
    return null;
  }
  const payload = dataLines.join("\n");
  try {
    const parsed = JSON.parse(payload) as ChatStreamEvent;
    return parsed;
  } catch {
    return null;
  }
}
