/**
 * ログインなしで読める教材の API (Issue #41。`GET /api/public/*`)。
 *
 * 公開の導入案内 (`/start`) が使う。トークンも独自ヘッダも付けない素の GET にする — 応答は
 * 誰に対しても同じなので Authorization を送る理由が無く、独自ヘッダが無ければ CORS の
 * プリフライトも要らない (ブラウザーのキャッシュも効く)。
 */

import type { PublicLesson, PublicUnit } from "@stella/shared/cms/types";

import { ApiClientError, isApiConfigured } from "./api-client";

const SERVER_URL = (import.meta.env.VITE_SERVER_URL ?? "").replace(/\/+$/, "");

async function publicGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${SERVER_URL}${path}`, {
    credentials: "omit",
    ...(signal ? { signal } : {}),
  });
  if (!res.ok) {
    let message = `サーバエラー (${res.status})`;
    try {
      message = ((await res.json()) as { error?: string }).error ?? message;
    } catch {
      // 本文が JSON でなければ既定の文言のまま。
    }
    throw new ApiClientError(message, res.status);
  }
  return (await res.json()) as T;
}

/** ログインなしで読める単元とレッスンの一覧。API 未設定なら空。 */
export async function listPublicUnits(signal?: AbortSignal): Promise<PublicUnit[]> {
  if (!isApiConfigured()) return [];
  return (await publicGet<{ units: PublicUnit[] }>("/api/public/units", signal)).units;
}

/** ログインなしで読めるレッスン 1 件。無い・公開していないものは null。 */
export async function getPublicLesson(
  lessonId: string,
  signal?: AbortSignal,
): Promise<PublicLesson | null> {
  if (!isApiConfigured()) return null;
  try {
    return (
      await publicGet<{ lesson: PublicLesson }>(
        `/api/public/lessons/${encodeURIComponent(lessonId)}`,
        signal,
      )
    ).lesson;
  } catch (err) {
    if (err instanceof ApiClientError && err.status === 404) return null;
    throw err;
  }
}
